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
import { scrollToBottom } from '../../../utils/dom';
import { MessageBatch } from '../../../../client/room/messages';
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
import { fallbackReply, getReplyId, getThreadId } from '../../../utils/room';

const TimelineViewContext = createContext<TimelineView | null>(null);
export const TimelineViewProvider = TimelineViewContext.Provider;

export const useTimelineView = (): TimelineView => {
  const timelineView = useContext(TimelineViewContext);
  if (!timelineView) {
    throw new Error('TimelineView is not provided!');
  }

  return timelineView;
};

export const useTimelinePrefetch = (timeline: TimelineView, limit: number) => {
  useEffect(
    () =>
      timeline.range.info.subscribe((info) => {
        if (info.start <= limit) {
          requestAnimationFrame(() => timeline.paginateBackward(limit));
        }
        if (info.end >= Math.max(timeline.batch.read.size - limit, 0)) {
          requestAnimationFrame(() => timeline.paginateForward(limit));
        }
      }),
    [timeline, limit]
  );
};

export const useTimelinePaginate = (timeline: TimelineView, limit: number) =>
  useCallback(
    (back: boolean) => {
      if (back) {
        timeline.paginateBackward(limit);
        return;
      }
      timeline.paginateForward(limit);
    },
    [timeline, limit]
  );

export const useTimelineScrollRestore = (
  timeline: TimelineView,
  scrollRef: RefObject<HTMLDivElement>
) => {
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      const scrollTop = timeline.range.scrollTopCache;
      if (scrollTop) {
        scrollEl.scrollTo({ top: scrollTop, behavior: 'instant' });
      } else {
        scrollToBottom(scrollEl);
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
 * When room loads and timeline does not hav any message
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

export const useEditorResizeStickBottom = (
  getScrollElement: () => HTMLElement | null,
  getEditorElement: () => HTMLElement | null,
  atBottom: boolean
) => {
  const atBottomRef = useRef(atBottom);
  atBottomRef.current = atBottom;

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

        if (atBottomRef.current) {
          scrollToBottom(scrollElement);
        }
      };
    }, [getScrollElement, getEditorElement, atBottomRef]),
    getEditorElement
  );
};

export const useAtBottomToggle = (
  getScrollElement: () => HTMLElement | null,
  atLiveEnd: boolean,
  onBottom?: (bottom: boolean) => void
): [boolean, RefObject<HTMLElement>] => {
  const atBottomAnchorRef = useRef<HTMLElement>(null);
  const [atBottom, setAtBottom] = useState<boolean>(true);

  const debounceSetAtBottom = useDebounce(
    useCallback(
      (entry: IntersectionObserverEntry) => {
        if (!entry.isIntersecting) {
          setAtBottom(false);
          onBottom?.(false);
        }
      },
      [onBottom]
    ),
    { wait: 1000 }
  );
  useIntersectionObserver(
    useCallback(
      (entries) => {
        const target = atBottomAnchorRef.current;
        if (!target) return;
        const targetEntry = getIntersectionObserverEntry(target, entries);
        if (targetEntry) debounceSetAtBottom(targetEntry);
        if (targetEntry?.isIntersecting && atLiveEnd) {
          setAtBottom(true);
          onBottom?.(true);
        }
      },
      [debounceSetAtBottom, atLiveEnd, onBottom]
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

  return [atBottom, atBottomAnchorRef];
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
    const replyEventId = fallbackReply(event.content) ? undefined : getReplyId(event.content);

    const collapsed =
      isPrevRendered &&
      !dayDivider &&
      (!newDivider || event.sender === ct.session.userId) &&
      prevEvent !== undefined &&
      prevEvent.sender === event.sender &&
      prevEvent.type === event.type &&
      (threadId ? prevEvent.event_id !== threadId : !getThreadId(prevEvent)) &&
      minuteDifference(prevEvent.origin_server_ts, event.origin_server_ts) < 2 &&
      !replyEventId;

    return collapsed;
  };

  const updateCollapse = (prevEvt: MessageEventWithoutRoomId, rendered: boolean) => {
    prevEvent = prevEvt;
    isPrevRendered = rendered;
  };

  return { getCollapsed, updateCollapse };
};
