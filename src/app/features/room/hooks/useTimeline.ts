import {
  createContext,
  MouseEventHandler,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAtom } from 'jotai';
import { Editor } from 'slate';
import { ReactEditor } from 'slate-react';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { scrollToBottom } from '../../../utils/dom';
import { MessageBatch, RangeInfo } from '../../../../client/room/messages';
import { getResizeObserverEntry, useResizeObserver } from '../../../hooks/useResizeObserver';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../../hooks/useIntersectionObserver';
import { useDebounce } from '../../../hooks/useDebounce';
import { TimelineView } from '../../../../client/room';
import {
  composerToReplyDraftAtom,
  getComposerId,
  ReplyDraft,
} from '../../../state/room/roomInputDrafts';
import { useRoom } from '../../../hooks/useRoom';
import { useOpenUserRoomProfile } from '../../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../../hooks/useSpace';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { useClient } from '../../../hooks/useClient';
import { createMentionElement, moveCursor } from '../../../components/editor';
import { inSameDay, minuteDifference } from '../../../utils/time';
import { getThreadId } from '../../../utils/room';
import { ItemRange, ScrollToElement, ScrollToItem } from '../../../hooks/useVirtualPaginator';
import { randomStr } from '../../../utils/common';
import { useObservableValue, useObservableValueListener } from '../../../hooks/useObservableValue';
import { ReadReceiptObject } from '../../../../client/storage/collections';
import { useAlive } from '../../../hooks/useAlive';

const TimelineViewContext = createContext<TimelineView | null>(null);
export const TimelineViewProvider = TimelineViewContext.Provider;

export const useTimelineView = (): TimelineView => {
  const timelineView = useContext(TimelineViewContext);
  if (!timelineView) {
    throw new Error('TimelineView is not provided!');
  }

  return timelineView;
};

export const useTimelineBatch = (timeline: TimelineView) => {
  const messageBatch = useObservableValue(timeline.batch);
  const { events } = messageBatch.messages;

  const range = useObservableValue(timeline.range.info);
  const rangeAtStart = range.start === 0;
  const rangeAtEnd = range.end === messageBatch.size;
  const atLiveEnd = !!messageBatch.next.end && rangeAtEnd;

  return {
    messageBatch,
    events,
    range,
    rangeAtStart,
    rangeAtEnd,
    atLiveEnd,
  };
};

export const useTimelineRelations = (timeline: TimelineView) => {
  const redacted = useObservableValue(timeline.relations.redacted);
  const reactions = useObservableValue(timeline.relations.reactions.eventToRelations);
  const edits = useObservableValue(timeline.relations.edits.eventToRelations);

  return {
    redacted,
    reactions,
    edits,
  };
};

export const useTimelinePrefetch = (timeline: TimelineView, limit: number, enable = true) => {
  useEffect(() => {
    const handleInfo = (info: RangeInfo) => {
      if (!enable) return;
      if (info.start <= limit) {
        requestAnimationFrame(() => timeline.paginateBackward(limit));
      }
      if (info.end >= Math.max(timeline.batch.read.size - limit, 0)) {
        requestAnimationFrame(() => timeline.paginateForward(limit));
      }
    };

    handleInfo(timeline.range.info.read);
    return timeline.range.info.subscribe(handleInfo);
  }, [timeline, limit, enable]);
};

export const useTimelinePaginate = (timeline: TimelineView, limit: number, enable = true) =>
  useCallback(
    (back: boolean) => {
      if (!enable) return;

      if (back) {
        timeline.paginateBackward(limit);
        return;
      }
      timeline.paginateForward(limit);
    },
    [timeline, limit, enable]
  );

export const useOnRangeChange = (timeline: TimelineView) =>
  useCallback((r: ItemRange) => timeline.range.setRange(r), [timeline]);

export const useGetItemElement = (scrollRef: RefObject<HTMLDivElement>) =>
  useCallback(
    (index: number) =>
      (scrollRef.current?.querySelector(`[data-message-item="${index}"]`) as HTMLElement) ??
      undefined,
    [scrollRef]
  );

/**
 * Restore timeline scrolling position on room open.
 * a) restore from the cache position
 * b) scroll to bottom if live timeline
 */
export const useTimelineScrollRestore = (
  timeline: TimelineView,
  scrollRef: RefObject<HTMLDivElement>
) => {
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      const scrollTop = timeline.range.scrollTopCache;
      const batch = timeline.batch.read;
      if (typeof scrollTop === 'number') {
        scrollEl.scrollTo({ top: scrollTop, behavior: 'instant' });
      } else if (batch.next.end && batch.messages.events.length > 0) {
        scrollToBottom(scrollEl, 'instant');
      }
    }
    return () => {
      if (!scrollEl) return;
      // eslint-disable-next-line no-param-reassign
      timeline.range.scrollTopCache = scrollEl.scrollTop;
    };
  }, [timeline, scrollRef]);
};

/**
 * When room loads and timeline does not have any message
 * scrolls to bottom after message appears.
 */
export const useRestoreScrollToBottom = (
  scrollRef: RefObject<HTMLDivElement>,
  msgBatch: MessageBatch
) => {
  const prevSize = useRef<number>();

  useEffect(() => {
    const pSize = prevSize.current;
    prevSize.current = msgBatch.size;

    const scrollElement = scrollRef.current;
    if (pSize === 0 && msgBatch.next.end && scrollElement) {
      requestAnimationFrame(() => {
        scrollToBottom(scrollElement, 'instant');
      });
    }
  }, [msgBatch, scrollRef]);
};

export const useTimelineContainerResizeStickBottom = (
  timeline: TimelineView,
  getScrollElement: () => HTMLElement | null,
  getContainerElement: () => HTMLElement | null,
  atBottomObservable: ObservableValue<boolean>,
  enable = true
) => {
  useResizeObserver(
    useMemo(() => {
      let mounted = false;
      return (entries) => {
        if (!mounted) {
          // skip initial mounting call
          mounted = true;
          return;
        }
        const containerEl = getContainerElement();
        if (!containerEl) return;
        const scrollElement = getScrollElement();
        const containerEntry = getResizeObserverEntry(containerEl, entries);
        if (!containerEntry || !scrollElement) return;

        if (atBottomObservable.read) {
          const batchChange = timeline.batch.read.change;
          const liveEnd = timeline.batch.read.next.end;
          const messageArrived = liveEnd && batchChange.type === 'Grow' && batchChange.dir === 'f';
          scrollToBottom(scrollElement, messageArrived ? 'smooth' : 'instant');
        }
      };
    }, [timeline, getContainerElement, getScrollElement, atBottomObservable]),
    enable ? getContainerElement : undefined
  );
};

export const useEditorResizeStickBottom = (
  getScrollElement: () => HTMLElement | null,
  getEditorElement: () => HTMLElement | null,
  atBottomObservable: ObservableValue<boolean>
) => {
  useResizeObserver(
    useMemo(() => {
      let mounted = false;
      return (entries) => {
        if (!mounted) {
          // skip initial mounting call
          mounted = true;
          return;
        }

        const editorEl = getEditorElement();
        if (!editorEl) return;
        const editorBaseEntry = getResizeObserverEntry(editorEl, entries);
        const scrollElement = getScrollElement();
        if (!editorBaseEntry || !scrollElement) return;

        if (atBottomObservable.read) {
          scrollToBottom(scrollElement);
        }
      };
    }, [getScrollElement, getEditorElement, atBottomObservable]),
    getEditorElement
  );
};

export const useUnreadMarker = (
  atBottomLazy: boolean,
  focused: boolean,
  readReceiptTs?: number
) => {
  const markerTsRef = useRef<number | undefined>(readReceiptTs);

  // receive initial read receipt ts
  if (markerTsRef.current === undefined && readReceiptTs !== undefined) {
    markerTsRef.current = readReceiptTs;
  }

  // Attention lost: move markerTs to latest readReceiptTs
  if (!focused) {
    markerTsRef.current = readReceiptTs;
  }

  // Not Reading Live: move markerTs to latest readReceiptTs
  if (!atBottomLazy) {
    markerTsRef.current = readReceiptTs;
  }

  return { markerTsRef, markerTs: markerTsRef.current };
};

const AT_BOTTOM_KEY = randomStr();
export const useAtBottomToggle = (
  getScrollElement: () => HTMLElement | null,
  atLiveEnd: boolean
) => {
  const atBottomAnchorRef = useRef<HTMLElement>(null);
  const [atBottomLazy, setAtBottomLazy] = useState<boolean>(atLiveEnd);
  const [atBottomObservable] = useState(
    () => new ObservableValue<boolean>(atLiveEnd, AT_BOTTOM_KEY)
  );

  const debounceSetAtBottomLazy = useDebounce(
    useCallback((entry: IntersectionObserverEntry) => {
      if (!entry.isIntersecting) {
        setAtBottomLazy(false);
      }
    }, []),
    { wait: 1000 }
  );
  useIntersectionObserver(
    useCallback(
      (entries) => {
        const target = atBottomAnchorRef.current;
        const targetEntry = target && getIntersectionObserverEntry(target, entries);
        if (!targetEntry) return;

        const atBottom = targetEntry.isIntersecting && atLiveEnd;
        atBottomObservable.publish(AT_BOTTOM_KEY, atBottom);

        // set to false with delay
        if (targetEntry) debounceSetAtBottomLazy(targetEntry);

        // set to true instantly
        if (targetEntry.isIntersecting && atLiveEnd) {
          setAtBottomLazy(true);
        }
      },
      [debounceSetAtBottomLazy, atLiveEnd, atBottomObservable]
    ),
    useCallback(
      () => ({
        root: getScrollElement(),
        rootMargin: '100px',
      }),
      [getScrollElement]
    ),
    useCallback(() => atBottomAnchorRef.current, [])
  );

  return {
    atBottomLazy,
    atBottomObservable,
    atBottomAnchorRef,
  };
};

export type FocusItem = { eventId: string; highlight: boolean; preventScroll?: boolean };
export const useFocusItem = (timeline: TimelineView, scrollToItem: ScrollToItem) => {
  const [focusItem, setFocusItem] = useState<FocusItem | undefined>();

  useLayoutEffect(() => {
    if (!focusItem) return undefined;

    const { eventId, preventScroll } = focusItem;
    const index = timeline.findIndex(eventId);
    if (!preventScroll) {
      scrollToItem(index, { align: 'center', behavior: 'instant', stopInView: true });
    }

    const t = setTimeout(() => setFocusItem(undefined), 2000);
    return () => clearTimeout(t);
  }, [focusItem, timeline, scrollToItem]);

  return {
    focusItem,
    setFocusItem,
  };
};

export const useNewDividerVisiblity = (getScrollElement: () => HTMLElement | null) => {
  const [newDividerVisible, setNewDividerVisibility] = useState(false);

  const observer = useIntersectionObserver(
    useCallback((entries) => {
      const target = entries.find((t) => t.isIntersecting);
      const intersect = target?.isIntersecting ?? false;
      setNewDividerVisibility(intersect);
    }, []),
    useCallback(
      () => ({
        root: getScrollElement(),
        rootMargin: '100px',
      }),
      [getScrollElement]
    )
  );

  const observeNewDivider = useCallback(
    (element: HTMLElement | null) => {
      setNewDividerVisibility(false);
      observer?.disconnect();
      if (element) {
        observer?.observe(element);
      }
    },
    [observer]
  );

  return {
    observeNewDivider,
    newDividerVisible,
  };
};

export const useAutoMarkAsRead = (
  atBottomObservable: ObservableValue<boolean>,
  markerTsRef: RefObject<number | undefined>,
  lastDividerVisibleTs: RefObject<number | undefined>,
  markAsRead: () => void
) => {
  const alive = useAlive();

  const autoMarkAsRead = useCallback(() => {
    if (!alive()) return;
    if (!atBottomObservable.read) return;
    if (markerTsRef.current === lastDividerVisibleTs.current) {
      markAsRead();
    }
  }, [atBottomObservable, markerTsRef, lastDividerVisibleTs, markAsRead, alive]);

  return autoMarkAsRead;
};

export const useMessageArrive = (timeline: TimelineView, onArrive: () => void) => {
  useObservableValueListener(
    timeline.batch,
    useCallback(
      (v) => {
        const msgArrived = v.next.end && v.change.type === 'Grow';
        if (!msgArrived) return;
        onArrive();
      },
      [onArrive]
    )
  );
};

export const useJumpHandlers = (
  timeline: TimelineView,
  readReceipt: ReadReceiptObject | undefined,
  scrollToItem: ScrollToItem,
  setFocusItem: (focus: FocusItem) => void,
  setEventLoading: (loading: boolean) => void,
  threadId?: string
) => {
  const ct = useClient();
  const alive = useAlive();

  const handleOpenEvent = useCallback(
    async (evtId: string) => {
      const index = timeline.findIndex(evtId);
      if (index !== -1) {
        scrollToItem(index, { align: 'center', behavior: 'smooth', stopInView: true });
        setFocusItem({ eventId: evtId, highlight: true, preventScroll: true });
        return;
      }
      if (evtId !== threadId) {
        // TODO: handle it properly
        setEventLoading(true);
        await timeline.jumpToEvent(evtId);
        if (!alive()) return;
        setEventLoading(false);
      }
      setFocusItem({ eventId: evtId, highlight: true });
    },
    [timeline, scrollToItem, setFocusItem, setEventLoading, alive, threadId]
  );

  const handleJumpToUnread = useCallback(async () => {
    if (!readReceipt) return;
    const unreadEvent = timeline.findFirstUnread(ct.session.userId, readReceipt.ts);
    if (unreadEvent) {
      const index = timeline.findIndex(unreadEvent.event_id);
      scrollToItem(index, { align: 'center', behavior: 'instant', stopInView: true });
      return;
    }
    setEventLoading(true);
    await timeline.jumpToEvent(readReceipt.eventId);
    if (!alive()) return;
    setEventLoading(false);
    const unreadEvId =
      timeline.findFirstUnread(ct.session.userId, readReceipt.ts)?.event_id ?? readReceipt.eventId;
    setFocusItem({ eventId: unreadEvId, highlight: false });
  }, [ct, readReceipt, timeline, scrollToItem, setFocusItem, setEventLoading, alive]);

  return {
    handleOpenEvent,
    handleJumpToUnread,
  };
};

export const useReplyClickHandler = (
  editor: Editor,
  threadId?: string
): [ReplyDraft | undefined, MouseEventHandler<HTMLButtonElement>] => {
  const roomId = useRoom();
  const [replyDraft, setReplyDraft] = useAtom(
    composerToReplyDraftAtom(getComposerId(roomId, threadId))
  );

  const handleReplyClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const replyId = evt.currentTarget.getAttribute('data-event-id');
      const senderId = evt.currentTarget.getAttribute('data-sender-id');
      if (!replyId || !senderId) {
        console.warn('Button should have "data-event-id" or "data-sender-id" attribute!');
        return;
      }

      if (senderId) {
        setReplyDraft({
          userId: senderId,
          eventId: replyId,
        });
        setTimeout(() => ReactEditor.focus(editor), 100);
      }
    },
    [setReplyDraft, editor]
  );

  return [replyDraft, handleReplyClick];
};

export const useUserClickHandler = () => {
  const roomId = useRoom();
  const spaceId = useSpaceOptionally();

  const openUserRoomProfile = useOpenUserRoomProfile();

  const handleUserClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) {
        console.warn('Button should have "data-user-id" attribute!');
        return;
      }
      openUserRoomProfile(roomId, spaceId, userId, evt.currentTarget.getBoundingClientRect());
    },
    [roomId, spaceId, openUserRoomProfile]
  );

  return handleUserClick;
};

export const useUsernameClickHandler = (editor: Editor) => {
  const ct = useClient();
  const membersAPI = useRoomMembersAPI();

  const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) {
        console.warn('Button should have "data-user-id" attribute!');
        return;
      }
      const name = membersAPI.getName(userId);
      editor.insertNode(
        createMentionElement(
          userId,
          name.startsWith('@') ? name : `@${name}`,
          userId === ct.session.userId
        )
      );
      ReactEditor.focus(editor);
      moveCursor(editor);
    },
    [ct, membersAPI, editor]
  );

  return handleUsernameClick;
};

export const useEventDivider = (readUptoTs?: number) => {
  let prevEvent: MessageEventWithoutRoomId | undefined;

  let dayDivider = false;
  let newDivider = false;

  const getDayDivider = (event: MessageEventWithoutRoomId) => {
    if (!dayDivider) {
      dayDivider = prevEvent
        ? !inSameDay(prevEvent.origin_server_ts, event.origin_server_ts)
        : false;
    }

    return dayDivider;
  };

  const getNewDivider = (event: MessageEventWithoutRoomId) => {
    if (!newDivider && readUptoTs && prevEvent) {
      newDivider = prevEvent.origin_server_ts < readUptoTs && readUptoTs <= event.origin_server_ts;
    }

    return newDivider;
  };

  const getThreadRootDivider = (rootEvent: MessageEventWithoutRoomId) =>
    prevEvent?.event_id === rootEvent.event_id;

  const updateDivider = (event: MessageEventWithoutRoomId) => {
    prevEvent = event;
  };

  const clearDayDivider = () => {
    dayDivider = false;
  };

  const clearNewDivider = () => {
    newDivider = false;
  };

  return {
    getDayDivider,
    getNewDivider,
    getThreadRootDivider,
    updateDivider,
    clearDayDivider,
    clearNewDivider,
  };
};

export const useEventCollapse = (threadId?: string) => {
  const ct = useClient();
  let prevEvent: MessageEventWithoutRoomId | undefined;
  let isPrevRendered = false;

  const getCollapsed = (
    event: MessageEventWithoutRoomId,
    newDivider: boolean,
    dayDivider: boolean
  ) => {
    const collapsed =
      isPrevRendered &&
      !dayDivider &&
      (!newDivider || event.sender === ct.session.userId) &&
      prevEvent !== undefined &&
      prevEvent.sender === event.sender &&
      prevEvent.type === event.type &&
      (threadId ? prevEvent.event_id !== threadId : !getThreadId(prevEvent)) &&
      minuteDifference(prevEvent.origin_server_ts, event.origin_server_ts) < 2;

    return collapsed;
  };

  const updateCollapse = (prevEvt: MessageEventWithoutRoomId, rendered: boolean) => {
    prevEvent = prevEvt;
    isPrevRendered = rendered;
  };

  return { getCollapsed, updateCollapse };
};

export const useMessageEditorOutOfViewFocus = (
  scrollRef: RefObject<HTMLDivElement>,
  scrollToElement: ScrollToElement,
  editId?: string
) => {
  // scroll out of view msg editor in view.
  useEffect(() => {
    if (editId) {
      const editMsgElement =
        (scrollRef.current?.querySelector(`[data-message-id="${editId}"]`) as HTMLElement) ??
        undefined;
      if (editMsgElement) {
        scrollToElement(editMsgElement, {
          align: 'center',
          behavior: 'smooth',
          stopInView: true,
        });
      }
    }
  }, [scrollRef, scrollToElement, editId]);
};
