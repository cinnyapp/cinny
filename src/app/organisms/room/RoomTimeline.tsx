import React, {
  Dispatch,
  MouseEventHandler,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Direction,
  EventTimeline,
  EventTimelineSet,
  EventTimelineSetHandlerMap,
  IEncryptedFile,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomEvent,
  RoomEventHandlerMap,
} from 'matrix-js-sdk';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import classNames from 'classnames';
import { ReactEditor } from 'slate-react';
import { Editor } from 'slate';
import to from 'await-to-js';
import { useSetAtom } from 'jotai';
import {
  Badge,
  Box,
  Chip,
  ContainerColor,
  Icon,
  Icons,
  Line,
  Scroll,
  Text,
  as,
  color,
  config,
  toRem,
} from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import { useTranslation } from 'react-i18next';
import {
  decryptFile,
  eventWithShortcode,
  factoryEventSentBy,
  getMxIdLocalPart,
  isRoomId,
  isUserId,
} from '../../utils/matrix';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVirtualPaginator, ItemRange } from '../../hooks/useVirtualPaginator';
import { useAlive } from '../../hooks/useAlive';
import { editableActiveElement, scrollToBottom } from '../../utils/dom';
import {
  DefaultPlaceholder,
  CompactPlaceholder,
  Reply,
  MessageBase,
  MessageDeletedContent,
  MessageBrokenContent,
  MessageUnsupportedContent,
  MessageEditedContent,
  MessageEmptyContent,
  AttachmentBox,
  Attachment,
  AttachmentContent,
  AttachmentHeader,
  Time,
  MessageBadEncryptedContent,
  MessageNotDecryptedContent,
  MessageTextBody,
} from '../../components/message';
import {
  emojifyAndLinkify,
  getReactCustomHtmlParser,
} from '../../plugins/react-custom-html-parser';
import {
  canEditEvent,
  decryptAllTimelineEvent,
  getEditedEvent,
  getEventReactions,
  getLatestEditableEvt,
  getMemberDisplayName,
  getReactionContent,
  isMembershipChanged,
  reactionOrEditEvent,
  trimReplyFromBody,
} from '../../utils/room';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import {
  openJoinAlias,
  openProfileViewer,
  selectRoom,
  selectTab,
} from '../../../client/action/navigation';
import { useForceUpdate } from '../../hooks/useForceUpdate';
import { parseGeoUri, scaleYDimension } from '../../utils/common';
import { useMatrixEventRenderer } from '../../hooks/useMatrixEventRenderer';
import { useRoomMsgContentRenderer } from '../../hooks/useRoomMsgContentRenderer';
import { IAudioContent, IImageContent, IVideoContent } from '../../../types/matrix/common';
import { getBlobSafeMimeType } from '../../utils/mimeTypes';
import {
  ImageContent,
  VideoContent,
  FileHeader,
  fileRenderer,
  AudioContent,
  Reactions,
  EventContent,
  Message,
  Event,
  EncryptedContent,
  StickerContent,
} from './message';
import { useMemberEventParser } from '../../hooks/useMemberEventParser';
import * as customHtmlCss from '../../styles/CustomHtml.css';
import { RoomIntro } from '../../components/room-intro';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import { markAsRead } from '../../../client/action/notifications';
import { useDebounce } from '../../hooks/useDebounce';
import { getResizeObserverEntry, useResizeObserver } from '../../hooks/useResizeObserver';
import * as css from './RoomTimeline.css';
import { inSameDay, minuteDifference, timeDayMonthYear, today, yesterday } from '../../utils/time';
import { createMentionElement, isEmptyEditor, moveCursor } from '../../components/editor';
import { roomIdToReplyDraftAtomFamily } from '../../state/roomInputDrafts';
import { usePowerLevelsAPI } from '../../hooks/usePowerLevels';
import { MessageEvent } from '../../../types/matrix/room';
import initMatrix from '../../../client/initMatrix';
import { useKeyDown } from '../../hooks/useKeyDown';
import cons from '../../../client/state/cons';
import { useDocumentFocusChange } from '../../hooks/useDocumentFocusChange';
import { EMOJI_PATTERN, HTTP_URL_PATTERN, VARIATION_SELECTOR_PATTERN } from '../../utils/regex';
import { UrlPreviewCard, UrlPreviewHolder } from './message/UrlPreviewCard';

// Thumbs up emoji found to have Variation Selector 16 at the end
// so included variation selector pattern in regex
const JUMBO_EMOJI_REG = new RegExp(
  `^(((${EMOJI_PATTERN})|(:.+?:))(${VARIATION_SELECTOR_PATTERN}|\\s)*){1,10}$`
);
const URL_REG = new RegExp(HTTP_URL_PATTERN, 'g');

const TimelineFloat = as<'div', css.TimelineFloatVariants>(
  ({ position, className, ...props }, ref) => (
    <Box
      className={classNames(css.TimelineFloat({ position }), className)}
      justifyContent="Center"
      alignItems="Center"
      gap="200"
      {...props}
      ref={ref}
    />
  )
);

const TimelineDivider = as<'div', { variant?: ContainerColor | 'Inherit' }>(
  ({ variant, children, ...props }, ref) => (
    <Box gap="100" justifyContent="Center" alignItems="Center" {...props} ref={ref}>
      <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
      {children}
      <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
    </Box>
  )
);

export const getLiveTimeline = (room: Room): EventTimeline =>
  room.getUnfilteredTimelineSet().getLiveTimeline();

export const getEventTimeline = (room: Room, eventId: string): EventTimeline | undefined => {
  const timelineSet = room.getUnfilteredTimelineSet();
  return timelineSet.getTimelineForEvent(eventId) ?? undefined;
};

export const getFirstLinkedTimeline = (
  timeline: EventTimeline,
  direction: Direction
): EventTimeline => {
  const linkedTm = timeline.getNeighbouringTimeline(direction);
  if (!linkedTm) return timeline;
  return getFirstLinkedTimeline(linkedTm, direction);
};

export const getLinkedTimelines = (timeline: EventTimeline): EventTimeline[] => {
  const firstTimeline = getFirstLinkedTimeline(timeline, Direction.Backward);
  const timelines: EventTimeline[] = [];

  for (
    let nextTimeline: EventTimeline | null = firstTimeline;
    nextTimeline;
    nextTimeline = nextTimeline.getNeighbouringTimeline(Direction.Forward)
  ) {
    timelines.push(nextTimeline);
  }
  return timelines;
};

export const timelineToEventsCount = (t: EventTimeline) => t.getEvents().length;
export const getTimelinesEventsCount = (timelines: EventTimeline[]): number => {
  const timelineEventCountReducer = (count: number, tm: EventTimeline) =>
    count + timelineToEventsCount(tm);
  return timelines.reduce(timelineEventCountReducer, 0);
};

export const getTimelineAndBaseIndex = (
  timelines: EventTimeline[],
  index: number
): [EventTimeline | undefined, number] => {
  let uptoTimelineLen = 0;
  const timeline = timelines.find((t) => {
    uptoTimelineLen += t.getEvents().length;
    if (index < uptoTimelineLen) return true;
    return false;
  });
  if (!timeline) return [undefined, 0];
  return [timeline, uptoTimelineLen - timeline.getEvents().length];
};

export const getTimelineRelativeIndex = (absoluteIndex: number, timelineBaseIndex: number) =>
  absoluteIndex - timelineBaseIndex;

export const getTimelineEvent = (timeline: EventTimeline, index: number): MatrixEvent | undefined =>
  timeline.getEvents()[index];

export const getEventIdAbsoluteIndex = (
  timelines: EventTimeline[],
  eventTimeline: EventTimeline,
  eventId: string
): number | undefined => {
  const timelineIndex = timelines.findIndex((t) => t === eventTimeline);
  if (timelineIndex === -1) return undefined;
  const eventIndex = eventTimeline.getEvents().findIndex((evt) => evt.getId() === eventId);
  if (eventIndex === -1) return undefined;
  const baseIndex = timelines
    .slice(0, timelineIndex)
    .reduce((accValue, timeline) => timeline.getEvents().length + accValue, 0);
  return baseIndex + eventIndex;
};

export const factoryGetFileSrcUrl =
  (httpUrl: string, mimeType: string, encFile?: IEncryptedFile) => async (): Promise<string> => {
    if (encFile) {
      if (typeof httpUrl !== 'string') throw new Error('Malformed event');
      const encRes = await fetch(httpUrl, { method: 'GET' });
      const encData = await encRes.arrayBuffer();
      const decryptedBlob = await decryptFile(encData, mimeType, encFile);
      return URL.createObjectURL(decryptedBlob);
    }
    return httpUrl;
  };

type RoomTimelineProps = {
  room: Room;
  eventId?: string;
  roomInputRef: RefObject<HTMLElement>;
  editor: Editor;
};

const PAGINATION_LIMIT = 80;

type Timeline = {
  linkedTimelines: EventTimeline[];
  range: ItemRange;
};

const useEventTimelineLoader = (
  mx: MatrixClient,
  room: Room,
  onLoad: (eventId: string, linkedTimelines: EventTimeline[], evtAbsIndex: number) => void,
  onError: (err: Error | null) => void
) => {
  const loadEventTimeline = useCallback(
    async (eventId: string) => {
      const [err, replyEvtTimeline] = await to(
        mx.getEventTimeline(room.getUnfilteredTimelineSet(), eventId)
      );
      if (!replyEvtTimeline) {
        onError(err ?? null);
        return;
      }
      const linkedTimelines = getLinkedTimelines(replyEvtTimeline);
      const absIndex = getEventIdAbsoluteIndex(linkedTimelines, replyEvtTimeline, eventId);

      if (absIndex === undefined) {
        onError(err ?? null);
        return;
      }

      onLoad(eventId, linkedTimelines, absIndex);
    },
    [mx, room, onLoad, onError]
  );

  return loadEventTimeline;
};

const useTimelinePagination = (
  mx: MatrixClient,
  timeline: Timeline,
  setTimeline: Dispatch<SetStateAction<Timeline>>,
  limit: number
) => {
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;
  const alive = useAlive();

  const handleTimelinePagination = useMemo(() => {
    let fetching = false;

    const recalibratePagination = (
      linkedTimelines: EventTimeline[],
      timelinesEventsCount: number[],
      backwards: boolean
    ) => {
      const topTimeline = linkedTimelines[0];
      const timelineMatch = (mt: EventTimeline) => (t: EventTimeline) => t === mt;

      const newLTimelines = getLinkedTimelines(topTimeline);
      const topTmIndex = newLTimelines.findIndex(timelineMatch(topTimeline));
      const topAddedTm = topTmIndex === -1 ? [] : newLTimelines.slice(0, topTmIndex);

      const topTmAddedEvt =
        timelineToEventsCount(newLTimelines[topTmIndex]) - timelinesEventsCount[0];
      const offsetRange = getTimelinesEventsCount(topAddedTm) + (backwards ? topTmAddedEvt : 0);

      setTimeline((currentTimeline) => ({
        linkedTimelines: newLTimelines,
        range:
          offsetRange > 0
            ? {
                start: currentTimeline.range.start + offsetRange,
                end: currentTimeline.range.end + offsetRange,
              }
            : { ...currentTimeline.range },
      }));
    };

    return async (backwards: boolean) => {
      if (fetching) return;
      const { linkedTimelines: lTimelines } = timelineRef.current;
      const timelinesEventsCount = lTimelines.map(timelineToEventsCount);

      const timelineToPaginate = backwards ? lTimelines[0] : lTimelines[lTimelines.length - 1];
      if (!timelineToPaginate) return;

      const paginationToken = timelineToPaginate.getPaginationToken(
        backwards ? Direction.Backward : Direction.Forward
      );
      if (
        !paginationToken &&
        getTimelinesEventsCount(lTimelines) !==
          getTimelinesEventsCount(getLinkedTimelines(timelineToPaginate))
      ) {
        recalibratePagination(lTimelines, timelinesEventsCount, backwards);
        return;
      }

      fetching = true;
      const [err] = await to(
        mx.paginateEventTimeline(timelineToPaginate, {
          backwards,
          limit,
        })
      );
      if (err) {
        // TODO: handle pagination error.
        return;
      }
      const fetchedTimeline =
        timelineToPaginate.getNeighbouringTimeline(
          backwards ? Direction.Backward : Direction.Forward
        ) ?? timelineToPaginate;
      // Decrypt all event ahead of render cycle
      if (mx.isRoomEncrypted(fetchedTimeline.getRoomId() ?? '')) {
        await to(decryptAllTimelineEvent(mx, fetchedTimeline));
      }

      fetching = false;
      if (alive()) {
        recalibratePagination(lTimelines, timelinesEventsCount, backwards);
      }
    };
  }, [mx, alive, setTimeline, limit]);
  return handleTimelinePagination;
};

const useLiveEventArrive = (room: Room, onArrive: (mEvent: MatrixEvent) => void) => {
  useEffect(() => {
    const handleTimelineEvent: EventTimelineSetHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      eventRoom,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (eventRoom?.roomId !== room.roomId || !data.liveEvent) return;
      onArrive(mEvent);
    };
    const handleRedaction: RoomEventHandlerMap[RoomEvent.Redaction] = (mEvent, eventRoom) => {
      if (eventRoom?.roomId !== room.roomId) return;
      onArrive(mEvent);
    };

    room.on(RoomEvent.Timeline, handleTimelineEvent);
    room.on(RoomEvent.Redaction, handleRedaction);
    return () => {
      room.removeListener(RoomEvent.Timeline, handleTimelineEvent);
      room.removeListener(RoomEvent.Redaction, handleRedaction);
    };
  }, [room, onArrive]);
};

const useLiveTimelineRefresh = (room: Room, onRefresh: () => void) => {
  useEffect(() => {
    const handleTimelineRefresh: RoomEventHandlerMap[RoomEvent.TimelineRefresh] = (r) => {
      if (r.roomId !== room.roomId) return;
      onRefresh();
    };

    room.on(RoomEvent.TimelineRefresh, handleTimelineRefresh);
    return () => {
      room.removeListener(RoomEvent.TimelineRefresh, handleTimelineRefresh);
    };
  }, [room, onRefresh]);
};

const getInitialTimeline = (room: Room) => {
  const linkedTimelines = getLinkedTimelines(getLiveTimeline(room));
  const evLength = getTimelinesEventsCount(linkedTimelines);
  return {
    linkedTimelines,
    range: {
      start: Math.max(evLength - PAGINATION_LIMIT, 0),
      end: evLength,
    },
  };
};

const getEmptyTimeline = () => ({
  range: { start: 0, end: 0 },
  linkedTimelines: [],
});

const getRoomUnreadInfo = (room: Room, scrollTo = false) => {
  const readUptoEventId = room.getEventReadUpTo(room.client.getUserId() ?? '');
  if (!readUptoEventId) return undefined;
  const evtTimeline = getEventTimeline(room, readUptoEventId);
  const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
  return {
    readUptoEventId,
    inLiveTimeline: latestTimeline === room.getLiveTimeline(),
    scrollTo,
  };
};

export function RoomTimeline({ room, eventId, roomInputRef, editor }: RoomTimelineProps) {
  const mx = useMatrixClient();
  const encryptedRoom = mx.isRoomEncrypted(room.roomId);
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [hideMembershipEvents] = useSetting(settingsAtom, 'hideMembershipEvents');
  const [hideNickAvatarEvents] = useSetting(settingsAtom, 'hideNickAvatarEvents');
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const showUrlPreview = encryptedRoom ? encUrlPreview : urlPreview;
  const [showHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');
  const setReplyDraft = useSetAtom(roomIdToReplyDraftAtomFamily(room.roomId));
  const { canDoAction, canSendEvent, getPowerLevel } = usePowerLevelsAPI();
  const myPowerLevel = getPowerLevel(mx.getUserId() ?? '');
  const canRedact = canDoAction('redact', myPowerLevel);
  const canSendReaction = canSendEvent(MessageEvent.Reaction, myPowerLevel);
  const [editId, setEditId] = useState<string>();

  const imagePackRooms: Room[] = useMemo(() => {
    const allParentSpaces = [
      room.roomId,
      ...(initMatrix.roomList?.getAllParentSpaces(room.roomId) ?? []),
    ];
    return allParentSpaces.reduce<Room[]>((list, rId) => {
      const r = mx.getRoom(rId);
      if (r) list.push(r);
      return list;
    }, []);
  }, [mx, room]);

  const [unreadInfo, setUnreadInfo] = useState(() => getRoomUnreadInfo(room, true));
  const readUptoEventIdRef = useRef<string>();
  if (unreadInfo) {
    readUptoEventIdRef.current = unreadInfo.readUptoEventId;
  }

  const atBottomAnchorRef = useRef<HTMLElement>(null);
  const [atBottom, setAtBottom] = useState<boolean>(true);
  const atBottomRef = useRef(atBottom);
  atBottomRef.current = atBottom;

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef({
    count: 0,
    smooth: true,
  });

  const focusItem = useRef<{
    index: number;
    scrollTo: boolean;
    highlight: boolean;
  }>();
  const alive = useAlive();
  const [, forceUpdate] = useForceUpdate();

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(mx, room, {
        handleSpoilerClick: (evt) => {
          const target = evt.currentTarget;
          if (target.getAttribute('aria-pressed') === 'true') {
            evt.stopPropagation();
            target.setAttribute('aria-pressed', 'false');
            target.style.cursor = 'initial';
          }
        },
        handleMentionClick: (evt) => {
          const target = evt.currentTarget;
          const mentionId = target.getAttribute('data-mention-id');
          if (typeof mentionId !== 'string') return;
          if (isUserId(mentionId)) {
            openProfileViewer(mentionId, room.roomId);
            return;
          }
          if (isRoomId(mentionId) && mx.getRoom(mentionId)) {
            if (mx.getRoom(mentionId)?.isSpaceRoom()) selectTab(mentionId);
            else selectRoom(mentionId);
            return;
          }
          openJoinAlias(mentionId);
        },
      }),
    [mx, room]
  );
  const parseMemberEvent = useMemberEventParser();

  const [timeline, setTimeline] = useState<Timeline>(() =>
    eventId ? getEmptyTimeline() : getInitialTimeline(room)
  );
  const eventsLength = getTimelinesEventsCount(timeline.linkedTimelines);
  const liveTimelineLinked =
    timeline.linkedTimelines[timeline.linkedTimelines.length - 1] === getLiveTimeline(room);
  const canPaginateBack =
    typeof timeline.linkedTimelines[0]?.getPaginationToken(Direction.Backward) === 'string';
  const rangeAtStart = timeline.range.start === 0;
  const rangeAtEnd = timeline.range.end === eventsLength;
  const atLiveEndRef = useRef(liveTimelineLinked && rangeAtEnd);
  atLiveEndRef.current = liveTimelineLinked && rangeAtEnd;

  const handleTimelinePagination = useTimelinePagination(
    mx,
    timeline,
    setTimeline,
    PAGINATION_LIMIT
  );

  const getScrollElement = useCallback(() => scrollRef.current, []);

  const { getItems, scrollToItem, scrollToElement, observeBackAnchor, observeFrontAnchor } =
    useVirtualPaginator({
      count: eventsLength,
      limit: PAGINATION_LIMIT,
      range: timeline.range,
      onRangeChange: useCallback((r) => setTimeline((cs) => ({ ...cs, range: r })), []),
      getScrollElement,
      getItemElement: useCallback(
        (index: number) =>
          (scrollRef.current?.querySelector(`[data-message-item="${index}"]`) as HTMLElement) ??
          undefined,
        []
      ),
      onEnd: handleTimelinePagination,
    });

  const loadEventTimeline = useEventTimelineLoader(
    mx,
    room,
    useCallback(
      (evtId, lTimelines, evtAbsIndex) => {
        if (!alive()) return;
        const evLength = getTimelinesEventsCount(lTimelines);

        focusItem.current = {
          index: evtAbsIndex,
          scrollTo: true,
          highlight: evtId !== readUptoEventIdRef.current,
        };
        setTimeline({
          linkedTimelines: lTimelines,
          range: {
            start: Math.max(evtAbsIndex - PAGINATION_LIMIT, 0),
            end: Math.min(evtAbsIndex + PAGINATION_LIMIT, evLength),
          },
        });
      },
      [alive]
    ),
    useCallback(() => {
      if (!alive()) return;
      setTimeline(getInitialTimeline(room));
      scrollToBottomRef.current.count += 1;
      scrollToBottomRef.current.smooth = false;
    }, [alive, room])
  );

  useLiveEventArrive(
    room,
    useCallback(
      (mEvt: MatrixEvent) => {
        // if user is at bottom of timeline
        // keep paginating timeline and conditionally mark as read
        // otherwise we update timeline without paginating
        // so timeline can be updated with evt like: edits, reactions etc
        if (atBottomRef.current) {
          if (document.hasFocus() && (!unreadInfo || mEvt.getSender() === mx.getUserId())) {
            requestAnimationFrame(() => markAsRead(mEvt.getRoomId()));
          }

          if (document.hasFocus()) {
            scrollToBottomRef.current.count += 1;
            scrollToBottomRef.current.smooth = true;
          } else if (!unreadInfo) {
            setUnreadInfo(getRoomUnreadInfo(room));
          }
          setTimeline((ct) => ({
            ...ct,
            range: {
              start: ct.range.start + 1,
              end: ct.range.end + 1,
            },
          }));
          return;
        }
        setTimeline((ct) => ({ ...ct }));
        if (!unreadInfo) {
          setUnreadInfo(getRoomUnreadInfo(room));
        }
      },
      [mx, room, unreadInfo]
    )
  );

  useLiveTimelineRefresh(
    room,
    useCallback(() => {
      if (liveTimelineLinked) {
        setTimeline(getInitialTimeline(room));
      }
    }, [room, liveTimelineLinked])
  );

  // Stay at bottom when room editor resize
  useResizeObserver(
    useMemo(() => {
      let mounted = false;
      return (entries) => {
        if (!mounted) {
          // skip initial mounting call
          mounted = true;
          return;
        }
        if (!roomInputRef.current) return;
        const editorBaseEntry = getResizeObserverEntry(roomInputRef.current, entries);
        const scrollElement = getScrollElement();
        if (!editorBaseEntry || !scrollElement) return;

        if (atBottomRef.current) {
          scrollToBottom(scrollElement);
        }
      };
    }, [getScrollElement, roomInputRef]),
    useCallback(() => roomInputRef.current, [roomInputRef])
  );

  const tryAutoMarkAsRead = useCallback(() => {
    if (!unreadInfo) {
      requestAnimationFrame(() => markAsRead(room.roomId));
      return;
    }
    const evtTimeline = getEventTimeline(room, unreadInfo.readUptoEventId);
    const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
    if (latestTimeline === room.getLiveTimeline()) {
      requestAnimationFrame(() => markAsRead(room.roomId));
    }
  }, [room, unreadInfo]);

  const debounceSetAtBottom = useDebounce(
    useCallback((entry: IntersectionObserverEntry) => {
      if (!entry.isIntersecting) setAtBottom(false);
    }, []),
    { wait: 1000 }
  );
  useIntersectionObserver(
    useCallback(
      (entries) => {
        const target = atBottomAnchorRef.current;
        if (!target) return;
        const targetEntry = getIntersectionObserverEntry(target, entries);
        if (targetEntry) debounceSetAtBottom(targetEntry);
        if (targetEntry?.isIntersecting && atLiveEndRef.current) {
          setAtBottom(true);
          tryAutoMarkAsRead();
        }
      },
      [debounceSetAtBottom, tryAutoMarkAsRead]
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

  useDocumentFocusChange(
    useCallback(
      (inFocus) => {
        if (inFocus && atBottomRef.current) {
          tryAutoMarkAsRead();
        }
      },
      [tryAutoMarkAsRead]
    )
  );

  // Handle up arrow edit
  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (
          isKeyHotkey('arrowup', evt) &&
          editableActiveElement() &&
          document.activeElement?.getAttribute('data-editable-name') === 'RoomInput' &&
          isEmptyEditor(editor)
        ) {
          const editableEvt = getLatestEditableEvt(room.getLiveTimeline(), (mEvt) =>
            canEditEvent(mx, mEvt)
          );
          const editableEvtId = editableEvt?.getId();
          if (!editableEvtId) return;
          setEditId(editableEvtId);
        }
      },
      [mx, room, editor]
    )
  );

  useEffect(() => {
    if (eventId) {
      setTimeline(getEmptyTimeline());
      loadEventTimeline(eventId);
    }
  }, [eventId, loadEventTimeline]);

  // Scroll to bottom on initial timeline load
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollToBottom(scrollEl);
    }
  }, []);

  // if live timeline is linked and unreadInfo change
  // Scroll to last read message
  useLayoutEffect(() => {
    const { readUptoEventId, inLiveTimeline, scrollTo } = unreadInfo ?? {};
    if (readUptoEventId && inLiveTimeline && scrollTo) {
      const linkedTimelines = getLinkedTimelines(getLiveTimeline(room));
      const evtTimeline = getEventTimeline(room, readUptoEventId);
      const absoluteIndex =
        evtTimeline && getEventIdAbsoluteIndex(linkedTimelines, evtTimeline, readUptoEventId);
      if (absoluteIndex) {
        scrollToItem(absoluteIndex, {
          behavior: 'instant',
          align: 'start',
          stopInView: true,
        });
      }
    }
  }, [room, unreadInfo, scrollToItem]);

  // scroll to focused message
  const focusItm = focusItem.current;
  useLayoutEffect(() => {
    if (focusItm && focusItm.scrollTo) {
      scrollToItem(focusItm.index, {
        behavior: 'instant',
        align: 'center',
        stopInView: true,
      });
    }

    focusItem.current = undefined;
  }, [focusItm, scrollToItem]);

  // scroll to bottom of timeline
  const scrollToBottomCount = scrollToBottomRef.current.count;
  useLayoutEffect(() => {
    if (scrollToBottomCount > 0) {
      const scrollEl = scrollRef.current;
      if (scrollEl)
        scrollToBottom(scrollEl, scrollToBottomRef.current.smooth ? 'smooth' : 'instant');
    }
  }, [scrollToBottomCount]);

  // Remove unreadInfo on mark as read
  useEffect(() => {
    const handleFullRead = (rId: string) => {
      if (rId !== room.roomId) return;
      setUnreadInfo(undefined);
    };
    initMatrix.notifications?.on(cons.events.notifications.FULL_READ, handleFullRead);
    return () => {
      initMatrix.notifications?.removeListener(cons.events.notifications.FULL_READ, handleFullRead);
    };
  }, [room]);

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
  }, [scrollToElement, editId]);

  const handleJumpToLatest = () => {
    setTimeline(getInitialTimeline(room));
    scrollToBottomRef.current.count += 1;
    scrollToBottomRef.current.smooth = false;
  };

  const handleJumpToUnread = () => {
    if (unreadInfo?.readUptoEventId) {
      setTimeline(getEmptyTimeline());
      loadEventTimeline(unreadInfo.readUptoEventId);
    }
  };

  const handleMarkAsRead = () => {
    markAsRead(room.roomId);
  };

  const handleOpenReply: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (evt) => {
      const replyId = evt.currentTarget.getAttribute('data-reply-id');
      if (typeof replyId !== 'string') return;
      const replyTimeline = getEventTimeline(room, replyId);
      const absoluteIndex =
        replyTimeline && getEventIdAbsoluteIndex(timeline.linkedTimelines, replyTimeline, replyId);

      if (typeof absoluteIndex === 'number') {
        scrollToItem(absoluteIndex, {
          behavior: 'smooth',
          align: 'center',
          stopInView: true,
        });
        focusItem.current = {
          index: absoluteIndex,
          scrollTo: false,
          highlight: true,
        };
        forceUpdate();
      } else {
        setTimeline(getEmptyTimeline());
        loadEventTimeline(replyId);
      }
    },
    [room, timeline, scrollToItem, loadEventTimeline, forceUpdate]
  );

  const handleUserClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) {
        console.warn('Button should have "data-user-id" attribute!');
        return;
      }
      openProfileViewer(userId, room.roomId);
    },
    [room]
  );
  const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) {
        console.warn('Button should have "data-user-id" attribute!');
        return;
      }
      const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
      editor.insertNode(
        createMentionElement(
          userId,
          name.startsWith('@') ? name : `@${name}`,
          userId === mx.getUserId()
        )
      );
      ReactEditor.focus(editor);
      moveCursor(editor);
    },
    [mx, room, editor]
  );

  const handleReplyClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const replyId = evt.currentTarget.getAttribute('data-event-id');
      if (!replyId) {
        console.warn('Button should have "data-event-id" attribute!');
        return;
      }
      const replyEvt = room.findEventById(replyId);
      if (!replyEvt) return;
      const editedReply = getEditedEvent(replyId, replyEvt, room.getUnfilteredTimelineSet());
      const { body, formatted_body: formattedBody }: Record<string, string> =
        editedReply?.getContent()['m.new_content'] ?? replyEvt.getContent();
      const senderId = replyEvt.getSender();
      if (senderId && typeof body === 'string') {
        setReplyDraft({
          userId: senderId,
          eventId: replyId,
          body,
          formattedBody,
        });
        setTimeout(() => ReactEditor.focus(editor), 100);
      }
    },
    [room, setReplyDraft, editor]
  );

  const handleReactionToggle = useCallback(
    (targetEventId: string, key: string, shortcode?: string) => {
      const relations = getEventReactions(room.getUnfilteredTimelineSet(), targetEventId);
      const allReactions = relations?.getSortedAnnotationsByKey() ?? [];
      const [, reactionsSet] = allReactions.find(([k]) => k === key) ?? [];
      const reactions = reactionsSet ? Array.from(reactionsSet) : [];
      const myReaction = reactions.find(factoryEventSentBy(mx.getUserId()!));

      if (myReaction && !!myReaction?.isRelation()) {
        mx.redactEvent(room.roomId, myReaction.getId()!);
        return;
      }
      const rShortcode =
        shortcode ||
        (reactions.find(eventWithShortcode)?.getContent().shortcode as string | undefined);
      mx.sendEvent(
        room.roomId,
        MessageEvent.Reaction,
        getReactionContent(targetEventId, key, rShortcode)
      );
    },
    [mx, room]
  );
  const handleEdit = useCallback(
    (editEvtId?: string) => {
      if (editEvtId) {
        setEditId(editEvtId);
        return;
      }
      setEditId(undefined);
      ReactEditor.focus(editor);
    },
    [editor]
  );

  const renderBody = (body: string, customBody?: string) => {
    if (body === '') <MessageEmptyContent />;
    if (customBody) {
      if (customBody === '') <MessageEmptyContent />;
      return parse(sanitizeCustomHtml(customBody), htmlReactParserOptions);
    }
    return emojifyAndLinkify(body, true);
  };

  const renderRoomMsgContent = useRoomMsgContentRenderer<[EventTimelineSet]>({
    renderText: (mEventId, mEvent, timelineSet) => {
      const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
      const { body, formatted_body: customBody }: Record<string, unknown> =
        editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent();

      if (typeof body !== 'string') return null;
      const trimmedBody = trimReplyFromBody(body);
      const urlsMatch = showUrlPreview && trimmedBody.match(URL_REG);
      const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

      return (
        <>
          <MessageTextBody
            preWrap={typeof customBody !== 'string'}
            jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
          >
            {renderBody(trimmedBody, typeof customBody === 'string' ? customBody : undefined)}
            {!!editedEvent && <MessageEditedContent />}
          </MessageTextBody>
          {urls && urls.length > 0 && (
            <UrlPreviewHolder>
              {urls.map((url) => (
                <UrlPreviewCard key={url} url={url} ts={mEvent.getTs()} />
              ))}
            </UrlPreviewHolder>
          )}
        </>
      );
    },
    renderEmote: (mEventId, mEvent, timelineSet) => {
      const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
      const { body, formatted_body: customBody } =
        editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent();
      const senderId = mEvent.getSender() ?? '';

      const senderDisplayName =
        getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;

      if (typeof body !== 'string') return null;
      const trimmedBody = trimReplyFromBody(body);
      const urlsMatch = showUrlPreview && trimmedBody.match(URL_REG);
      const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

      return (
        <>
          <MessageTextBody
            emote
            preWrap={typeof customBody !== 'string'}
            jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
          >
            <b>{`${senderDisplayName} `}</b>
            {renderBody(trimmedBody, typeof customBody === 'string' ? customBody : undefined)}
            {!!editedEvent && <MessageEditedContent />}
          </MessageTextBody>
          {urls && urls.length > 0 && (
            <UrlPreviewHolder>
              {urls.map((url) => (
                <UrlPreviewCard key={url} url={url} ts={mEvent.getTs()} />
              ))}
            </UrlPreviewHolder>
          )}
        </>
      );
    },
    renderNotice: (mEventId, mEvent, timelineSet) => {
      const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
      const { body, formatted_body: customBody }: Record<string, unknown> =
        editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent();

      if (typeof body !== 'string') return null;
      const trimmedBody = trimReplyFromBody(body);
      const urlsMatch = showUrlPreview && trimmedBody.match(URL_REG);
      const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

      return (
        <>
          <MessageTextBody
            notice
            preWrap={typeof customBody !== 'string'}
            jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
          >
            {renderBody(trimmedBody, typeof customBody === 'string' ? customBody : undefined)}
            {!!editedEvent && <MessageEditedContent />}
          </MessageTextBody>
          {urls && urls.length > 0 && (
            <UrlPreviewHolder>
              {urls.map((url) => (
                <UrlPreviewCard key={url} url={url} ts={mEvent.getTs()} />
              ))}
            </UrlPreviewHolder>
          )}
        </>
      );
    },
    renderImage: (mEventId, mEvent) => {
      const content = mEvent.getContent<IImageContent>();
      const imgInfo = content?.info;
      const mxcUrl = content.file?.url ?? content.url;
      if (typeof mxcUrl !== 'string') {
        return null;
      }
      const height = scaleYDimension(imgInfo?.w || 400, 400, imgInfo?.h || 400);

      return (
        <Attachment>
          <AttachmentBox
            style={{
              height: toRem(height < 48 ? 48 : height),
            }}
          >
            <ImageContent
              body={content.body || 'Image'}
              info={imgInfo}
              mimeType={imgInfo?.mimetype}
              url={mxcUrl}
              encInfo={content.file}
              autoPlay={mediaAutoLoad}
            />
          </AttachmentBox>
        </Attachment>
      );
    },
    renderVideo: (mEventId, mEvent) => {
      const content = mEvent.getContent<IVideoContent>();

      const videoInfo = content?.info;
      const mxcUrl = content.file?.url ?? content.url;
      const safeMimeType = getBlobSafeMimeType(videoInfo?.mimetype ?? '');

      if (!videoInfo || !safeMimeType.startsWith('video') || typeof mxcUrl !== 'string') {
        if (mxcUrl) {
          return fileRenderer(mEventId, mEvent);
        }
        return null;
      }

      const height = scaleYDimension(videoInfo.w || 400, 400, videoInfo.h || 400);

      return (
        <Attachment>
          <AttachmentBox
            style={{
              height: toRem(height < 48 ? 48 : height),
            }}
          >
            <VideoContent
              body={content.body || 'Video'}
              info={videoInfo}
              mimeType={safeMimeType}
              url={mxcUrl}
              encInfo={content.file}
              loadThumbnail={mediaAutoLoad}
            />
          </AttachmentBox>
        </Attachment>
      );
    },
    renderAudio: (mEventId, mEvent) => {
      const content = mEvent.getContent<IAudioContent>();

      const audioInfo = content?.info;
      const mxcUrl = content.file?.url ?? content.url;
      const safeMimeType = getBlobSafeMimeType(audioInfo?.mimetype ?? '');

      if (!audioInfo || !safeMimeType.startsWith('audio') || typeof mxcUrl !== 'string') {
        if (mxcUrl) {
          return fileRenderer(mEventId, mEvent);
        }
        return null;
      }

      return (
        <Attachment>
          <AttachmentHeader>
            <FileHeader body={content.body ?? 'Audio'} mimeType={safeMimeType} />
          </AttachmentHeader>
          <AttachmentBox>
            <AttachmentContent>
              <AudioContent
                info={audioInfo}
                mimeType={safeMimeType}
                url={mxcUrl}
                encInfo={content.file}
              />
            </AttachmentContent>
          </AttachmentBox>
        </Attachment>
      );
    },
    renderLocation: (mEventId, mEvent) => {
      const content = mEvent.getContent();
      const geoUri = content.geo_uri;
      if (typeof geoUri !== 'string') return null;
      const location = parseGeoUri(geoUri);
      return (
        <Box direction="Column" alignItems="Start" gap="100">
          <Text size="T400">{geoUri}</Text>
          <Chip
            as="a"
            size="400"
            href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
            target="_blank"
            rel="noreferrer noopener"
            variant="Primary"
            radii="Pill"
            before={<Icon src={Icons.External} size="50" />}
          >
            <Text size="B300">Open Location</Text>
          </Chip>
        </Box>
      );
    },
    renderFile: fileRenderer,
    renderBadEncrypted: () => (
      <Text>
        <MessageBadEncryptedContent />
      </Text>
    ),
    renderUnsupported: (mEventId, mEvent) => {
      if (mEvent.isRedacted()) {
        const redactedEvt = mEvent.getRedactionEvent();
        const reason =
          redactedEvt && 'content' in redactedEvt ? redactedEvt.content.reason : undefined;

        return (
          <Text>
            <MessageDeletedContent reason={reason} />
          </Text>
        );
      }
      return (
        <Text>
          <MessageUnsupportedContent />
        </Text>
      );
    },
    renderBrokenFallback: (mEventId, mEvent) => {
      if (mEvent.isRedacted()) {
        const redactedEvt = mEvent.getRedactionEvent();
        const reason =
          redactedEvt && 'content' in redactedEvt ? redactedEvt.content.reason : undefined;
        return (
          <Text>
            <MessageDeletedContent reason={reason} />
          </Text>
        );
      }
      return (
        <Text>
          <MessageBrokenContent />
        </Text>
      );
    },
  });

  const { t } = useTranslation();

  const renderMatrixEvent = useMatrixEventRenderer<[number, EventTimelineSet, boolean]>({
    renderRoomMessage: (mEventId, mEvent, item, timelineSet, collapse) => {
      const reactionRelations = getEventReactions(timelineSet, mEventId);
      const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
      const hasReactions = reactions && reactions.length > 0;
      const { replyEventId } = mEvent;
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;

      return (
        <Message
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          messageSpacing={messageSpacing}
          messageLayout={messageLayout}
          collapse={collapse}
          highlight={highlighted}
          edit={editId === mEventId}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
          canSendReaction={canSendReaction}
          imagePackRooms={imagePackRooms}
          relations={hasReactions ? reactionRelations : undefined}
          onUserClick={handleUserClick}
          onUsernameClick={handleUsernameClick}
          onReplyClick={handleReplyClick}
          onReactionToggle={handleReactionToggle}
          onEditId={handleEdit}
          reply={
            replyEventId && (
              <Reply
                as="button"
                mx={mx}
                room={room}
                timelineSet={timelineSet}
                eventId={replyEventId}
                data-reply-id={replyEventId}
                onClick={handleOpenReply}
              />
            )
          }
          reactions={
            reactionRelations && (
              <Reactions
                style={{ marginTop: config.space.S200 }}
                room={room}
                relations={reactionRelations}
                mEventId={mEventId}
                canSendReaction={canSendReaction}
                onReactionToggle={handleReactionToggle}
              />
            )
          }
        >
          {renderRoomMsgContent(mEventId, mEvent, timelineSet)}
        </Message>
      );
    },
    renderRoomEncrypted: (mEventId, mEvent, item, timelineSet, collapse) => {
      const reactionRelations = getEventReactions(timelineSet, mEventId);
      const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
      const hasReactions = reactions && reactions.length > 0;
      const { replyEventId } = mEvent;
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;

      return (
        <Message
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          messageSpacing={messageSpacing}
          messageLayout={messageLayout}
          collapse={collapse}
          highlight={highlighted}
          edit={editId === mEventId}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
          canSendReaction={canSendReaction}
          imagePackRooms={imagePackRooms}
          relations={hasReactions ? reactionRelations : undefined}
          onUserClick={handleUserClick}
          onUsernameClick={handleUsernameClick}
          onReplyClick={handleReplyClick}
          onReactionToggle={handleReactionToggle}
          onEditId={handleEdit}
          reply={
            replyEventId && (
              <Reply
                as="button"
                mx={mx}
                room={room}
                timelineSet={timelineSet}
                eventId={replyEventId}
                data-reply-id={replyEventId}
                onClick={handleOpenReply}
              />
            )
          }
          reactions={
            reactionRelations && (
              <Reactions
                style={{ marginTop: config.space.S200 }}
                room={room}
                relations={reactionRelations}
                mEventId={mEventId}
                canSendReaction={canSendReaction}
                onReactionToggle={handleReactionToggle}
              />
            )
          }
        >
          <EncryptedContent mEvent={mEvent}>
            {() => {
              if (mEvent.isRedacted()) return <MessageDeletedContent />;
              if (mEvent.getType() === MessageEvent.Sticker)
                return <StickerContent mEvent={mEvent} autoPlay={mediaAutoLoad} />;
              if (mEvent.getType() === MessageEvent.RoomMessage)
                return renderRoomMsgContent(mEventId, mEvent, timelineSet);
              if (mEvent.getType() === MessageEvent.RoomMessageEncrypted)
                return (
                  <Text>
                    <MessageNotDecryptedContent />
                  </Text>
                );
              return (
                <Text>
                  <MessageUnsupportedContent />
                </Text>
              );
            }}
          </EncryptedContent>
        </Message>
      );
    },
    renderSticker: (mEventId, mEvent, item, timelineSet, collapse) => {
      const reactionRelations = getEventReactions(timelineSet, mEventId);
      const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
      const hasReactions = reactions && reactions.length > 0;
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;

      return (
        <Message
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          messageSpacing={messageSpacing}
          messageLayout={messageLayout}
          collapse={collapse}
          highlight={highlighted}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
          canSendReaction={canSendReaction}
          imagePackRooms={imagePackRooms}
          relations={hasReactions ? reactionRelations : undefined}
          onUserClick={handleUserClick}
          onUsernameClick={handleUsernameClick}
          onReplyClick={handleReplyClick}
          onReactionToggle={handleReactionToggle}
          reactions={
            reactionRelations && (
              <Reactions
                style={{ marginTop: config.space.S200 }}
                room={room}
                relations={reactionRelations}
                mEventId={mEventId}
                canSendReaction={canSendReaction}
                onReactionToggle={handleReactionToggle}
              />
            )
          }
        >
          <StickerContent mEvent={mEvent} autoPlay={mediaAutoLoad} />
        </Message>
      );
    },
    renderRoomMember: (mEventId, mEvent, item) => {
      const membershipChanged = isMembershipChanged(mEvent);
      if (membershipChanged && hideMembershipEvents) return null;
      if (!membershipChanged && hideNickAvatarEvents) return null;

      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const parsed = parseMemberEvent(mEvent);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            iconSrc={parsed.icon}
            content={
              <Box grow="Yes" direction="Column">
                <Text size="T300" priority="300">
                  {parsed.body}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
    renderRoomName: (mEventId, mEvent, item) => {
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;
    
      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            iconSrc={Icons.Hash}
            content={
              <Box grow="Yes" direction="Column">
                <Text size="T300" priority="300">
                  <b>{senderName}</b>
                  {t('Organisms.RoomCommon.changed_room_name')}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
    renderRoomTopic: (mEventId, mEvent, item) => {
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            iconSrc={Icons.Hash}
            content={
              <Box grow="Yes" direction="Column">
                <Text size="T300" priority="300">
                  <b>{senderName}</b>
                  {' changed room topic'}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
    renderRoomAvatar: (mEventId, mEvent, item) => {
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            iconSrc={Icons.Hash}
            content={
              <Box grow="Yes" direction="Column">
                <Text size="T300" priority="300">
                  <b>{senderName}</b>
                  {' changed room avatar'}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
    renderStateEvent: (mEventId, mEvent, item) => {
      if (!showHiddenEvents) return null;
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            iconSrc={Icons.Code}
            content={
              <Box grow="Yes" direction="Column">
                <Text size="T300" priority="300">
                  <b>{senderName}</b>
                  {' sent '}
                  <code className={customHtmlCss.Code}>{mEvent.getType()}</code>
                  {' state event'}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
    renderEvent: (mEventId, mEvent, item) => {
      if (!showHiddenEvents) return null;
      if (Object.keys(mEvent.getContent()).length === 0) return null;
      if (mEvent.getRelation()) return null;
      if (mEvent.isRedaction()) return null;

      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            iconSrc={Icons.Code}
            content={
              <Box grow="Yes" direction="Column">
                <Text size="T300" priority="300">
                  <b>{senderName}</b>
                  {' sent '}
                  <code className={customHtmlCss.Code}>{mEvent.getType()}</code>
                  {' event'}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
  });

  let prevEvent: MatrixEvent | undefined;
  let isPrevRendered = false;
  let newDivider = false;
  let dayDivider = false;
  const eventRenderer = (item: number) => {
    const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(timeline.linkedTimelines, item);
    if (!eventTimeline) return null;
    const timelineSet = eventTimeline?.getTimelineSet();
    const mEvent = getTimelineEvent(eventTimeline, getTimelineRelativeIndex(item, baseIndex));
    const mEventId = mEvent?.getId();

    if (!mEvent || !mEventId) return null;

    if (!newDivider && readUptoEventIdRef.current) {
      newDivider = prevEvent?.getId() === readUptoEventIdRef.current;
    }
    if (!dayDivider) {
      dayDivider = prevEvent ? !inSameDay(prevEvent.getTs(), mEvent.getTs()) : false;
    }

    const collapsed =
      isPrevRendered &&
      !dayDivider &&
      (!newDivider || mEvent.getSender() === mx.getUserId()) &&
      prevEvent !== undefined &&
      prevEvent.getSender() === mEvent.getSender() &&
      prevEvent.getType() === mEvent.getType() &&
      minuteDifference(prevEvent.getTs(), mEvent.getTs()) < 2;

    const eventJSX = reactionOrEditEvent(mEvent)
      ? null
      : renderMatrixEvent(mEventId, mEvent, item, timelineSet, collapsed);
    prevEvent = mEvent;
    isPrevRendered = !!eventJSX;

    const newDividerJSX =
      newDivider && eventJSX && mEvent.getSender() !== mx.getUserId() ? (
        <MessageBase space={messageSpacing}>
          <TimelineDivider style={{ color: color.Success.Main }} variant="Inherit">
            <Badge as="span" size="500" variant="Success" fill="Solid" radii="300">
              <Text size="L400">{t('Organisms.RoomCommon.new_messages')}</Text>
            </Badge>
          </TimelineDivider>
        </MessageBase>
      ) : null;

    const dayDividerJSX =
      dayDivider && eventJSX ? (
        <MessageBase space={messageSpacing}>
          <TimelineDivider variant="Surface">
            <Badge as="span" size="500" variant="Secondary" fill="None" radii="300">
              <Text size="L400">
                {(() => {
                  if (today(mEvent.getTs())) return t('Time.today');
                  if (yesterday(mEvent.getTs())) return t('Time.yesterday');
                  return timeDayMonthYear(mEvent.getTs());
                })()}
              </Text>
            </Badge>
          </TimelineDivider>
        </MessageBase>
      ) : null;

    if (eventJSX && (newDividerJSX || dayDividerJSX)) {
      if (newDividerJSX) newDivider = false;
      if (dayDividerJSX) dayDivider = false;

      return (
        <React.Fragment key={mEventId}>
          {newDividerJSX}
          {dayDividerJSX}
          {eventJSX}
        </React.Fragment>
      );
    }

    return eventJSX;
  };

  return (
    <Box style={{ height: '100%', color: color.Surface.OnContainer }} grow="Yes">
      {unreadInfo?.readUptoEventId && !unreadInfo?.inLiveTimeline && (
        <TimelineFloat position="Top">
          <Chip
            variant="Primary"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.MessageUnread} />}
            onClick={handleJumpToUnread}
          >
            <Text size="L400">{t('Organisms.RoomCommon.jump_to_unread')}</Text>
          </Chip>

          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.CheckTwice} />}
            onClick={handleMarkAsRead}
          >
            <Text size="L400">{t('Organisms.RoomCommon.mark_as_read')}</Text>
          </Chip>
        </TimelineFloat>
      )}
      <Scroll ref={scrollRef} visibility="Hover">
        <Box
          direction="Column"
          justifyContent="End"
          style={{ minHeight: '100%', padding: `${config.space.S600} 0` }}
        >
          {!canPaginateBack && rangeAtStart && getItems().length > 0 && (
            <div
              style={{
                padding: `${config.space.S700} ${config.space.S400} ${config.space.S600} ${
                  messageLayout === 1 ? config.space.S400 : toRem(64)
                }`,
              }}
            >
              <RoomIntro room={room} />
            </div>
          )}
          {(canPaginateBack || !rangeAtStart) &&
            (messageLayout === 1 ? (
              <>
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder ref={observeBackAnchor} />
              </>
            ) : (
              <>
                <DefaultPlaceholder />
                <DefaultPlaceholder />
                <DefaultPlaceholder ref={observeBackAnchor} />
              </>
            ))}

          {getItems().map(eventRenderer)}

          {(!liveTimelineLinked || !rangeAtEnd) &&
            (messageLayout === 1 ? (
              <>
                <CompactPlaceholder ref={observeFrontAnchor} />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
              </>
            ) : (
              <>
                <DefaultPlaceholder ref={observeFrontAnchor} />
                <DefaultPlaceholder />
                <DefaultPlaceholder />
              </>
            ))}
          <span ref={atBottomAnchorRef} />
        </Box>
      </Scroll>
      {!atBottom && (
        <TimelineFloat position="Bottom">
          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.ArrowBottom} />}
            onClick={handleJumpToLatest}
          >
            <Text size="L400">{t('Organisms.RoomCommon.jump_to_latest')}</Text>
          </Chip>
        </TimelineFloat>
      )}
    </Box>
  );
}
