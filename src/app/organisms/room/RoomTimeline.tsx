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
  EventType,
  IEncryptedFile,
  MatrixClient,
  MatrixEvent,
  RelationType,
  Room,
  RoomEvent,
} from 'matrix-js-sdk';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import classNames from 'classnames';
import to from 'await-to-js';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
import Linkify from 'linkify-react';
import { decryptFile, getMxIdLocalPart, matrixEventByRecency } from '../../utils/matrix';
import colorMXID from '../../../util/colorMXID';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVirtualPaginator, ItemRange } from '../../hooks/useVirtualPaginator';
import { useAlive } from '../../hooks/useAlive';
import { scrollToBottom } from '../../utils/dom';
import {
  ModernLayout,
  CompactLayout,
  BubbleLayout,
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
  EventBase,
  AvatarBase,
  Time,
} from '../../components/message';
import { LINKIFY_OPTS, getReactCustomHtmlParser } from '../../plugins/react-custom-html-parser';
import {
  decryptAllTimelineEvent,
  getMemberAvatarMxc,
  getMemberDisplayName,
} from '../../utils/room';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { openProfileViewer } from '../../../client/action/navigation';
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
} from './message';
import { useMemberEventParser } from '../../hooks/useMemberEventParser';
import * as customHtmlCss from '../../styles/CustomHtml.css';
import { RoomIntro } from '../../components/room-intro';
import {
  OnIntersectionCallback,
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import { markAsRead } from '../../../client/action/notifications';
import { useDebounce } from '../../hooks/useDebounce';
import { getResizeObserverEntry, useResizeObserver } from '../../hooks/useResizeObserver';
import * as css from './RoomTimeline.css';
import { inSameDay, minuteDifference, timeDayMonthYear, today, yesterday } from '../../utils/time';

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
  const timelines = [];

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

export const getEventReactions = (timelineSet: EventTimelineSet, eventId: string) =>
  timelineSet.relations.getChildEventsForEvent(
    eventId,
    RelationType.Annotation,
    EventType.Reaction
  );

export const getEventEdits = (timelineSet: EventTimelineSet, eventId: string, eventType: string) =>
  timelineSet.relations.getChildEventsForEvent(eventId, RelationType.Replace, eventType);

export const getLatestEdit = (
  targetEvent: MatrixEvent,
  editEvents: MatrixEvent[]
): MatrixEvent | undefined => {
  const eventByTargetSender = (rEvent: MatrixEvent) =>
    rEvent.getSender() === targetEvent.getSender();
  return editEvents.sort(matrixEventByRecency).find(eventByTargetSender);
};

export const getEditedEvent = (
  mEventId: string,
  mEvent: MatrixEvent,
  timelineSet: EventTimelineSet
): MatrixEvent | undefined => {
  const edits = getEventEdits(timelineSet, mEventId, mEvent.getType());
  return edits && getLatestEdit(mEvent, edits.getRelations());
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

const useLiveEventArrive = (
  mx: MatrixClient,
  roomId: string | undefined,
  onArrive: (mEvent: MatrixEvent) => void
) => {
  useEffect(() => {
    const handleTimelineEvent: EventTimelineSetHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      eventRoom,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (eventRoom?.roomId !== roomId || !data.liveEvent) return;
      onArrive(mEvent);
    };

    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [mx, roomId, onArrive]);
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

export function RoomTimeline({ room, eventId, roomInputRef }: RoomTimelineProps) {
  const mx = useMatrixClient();
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [hideMembershipEvents] = useSetting(settingsAtom, 'hideMembershipEvents');
  const [hideNickAvatarEvents] = useSetting(settingsAtom, 'hideNickAvatarEvents');

  const [unreadInfo, setUnreadInfo] = useState(() => {
    const readUptoEventId = room.getEventReadUpTo(mx.getUserId() ?? '');
    if (!readUptoEventId) return undefined;
    const evtTimeline = getEventTimeline(room, readUptoEventId);
    const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
    return {
      readUptoEventId,
      inLiveTimeline: latestTimeline === room.getLiveTimeline(),
    };
  });
  const readUptoEventIdRef = useRef<string>();
  if (unreadInfo) {
    readUptoEventIdRef.current = unreadInfo.readUptoEventId;
  }

  const atBottomAnchorRef = useRef<HTMLElement>(null);
  const [atBottom, setAtBottom] = useState<boolean>();
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
    () => getReactCustomHtmlParser(mx, room),
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

  const handleTimelinePagination = useTimelinePagination(
    mx,
    timeline,
    setTimeline,
    PAGINATION_LIMIT
  );

  const getScrollElement = useCallback(() => scrollRef.current, []);

  const { getItems, scrollToItem, observeBackAnchor, observeFrontAnchor } = useVirtualPaginator({
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
          highlight: evtId !== unreadInfo?.readUptoEventId,
        };
        setTimeline({
          linkedTimelines: lTimelines,
          range: {
            start: Math.max(evtAbsIndex - PAGINATION_LIMIT, 0),
            end: Math.min(evtAbsIndex + PAGINATION_LIMIT, evLength),
          },
        });
      },
      [unreadInfo, alive]
    ),
    useCallback(() => {
      if (!alive()) return;
      setTimeline(getInitialTimeline(room));
      scrollToBottomRef.current.count += 1;
      scrollToBottomRef.current.smooth = false;
    }, [alive, room])
  );

  useLiveEventArrive(
    mx,
    liveTimelineLinked && rangeAtEnd ? room.roomId : undefined,
    useCallback(() => {
      if (atBottomRef.current) {
        scrollToBottomRef.current.count += 1;
        scrollToBottomRef.current.smooth = true;
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
    }, [])
  );

  // Stay at bottom when room editor resize
  useResizeObserver(
    useCallback(
      (entries) => {
        if (!roomInputRef.current) return;
        const editorBaseEntry = getResizeObserverEntry(roomInputRef.current, entries);
        const scrollElement = getScrollElement();
        if (!editorBaseEntry || !scrollElement) return;

        if (atBottomRef.current) {
          scrollToBottom(scrollElement);
        }
      },
      [getScrollElement, roomInputRef]
    ),
    useCallback(() => roomInputRef.current, [roomInputRef])
  );

  const handleAtBottomIntersection: OnIntersectionCallback = useCallback((entries) => {
    const target = atBottomAnchorRef.current;
    if (!target) return;
    const targetEntry = getIntersectionObserverEntry(target, entries);

    setAtBottom(targetEntry?.isIntersecting === true);
  }, []);
  useIntersectionObserver(
    useDebounce(handleAtBottomIntersection, {
      wait: 200,
    }),
    useMemo(
      () => ({
        root: getScrollElement(),
        rootMargin: '100px',
      }),
      [getScrollElement]
    ),
    useCallback(() => atBottomAnchorRef.current, [])
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
    if (scrollEl) scrollToBottom(scrollEl);
  }, []);

  // Scroll to last read message if it is linked to live timeline
  useLayoutEffect(() => {
    const { readUptoEventId, inLiveTimeline } = unreadInfo ?? {};
    if (readUptoEventId && inLiveTimeline) {
      const linkedTimelines = getLinkedTimelines(getLiveTimeline(room));
      const evtTimeline = getEventTimeline(room, readUptoEventId);
      const absoluteIndex =
        evtTimeline && getEventIdAbsoluteIndex(linkedTimelines, evtTimeline, readUptoEventId);
      if (absoluteIndex)
        scrollToItem(absoluteIndex, {
          behavior: 'instant',
          align: 'start',
          stopInView: true,
        });
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

  // send readReceipts when reach bottom
  useEffect(() => {
    if (liveTimelineLinked && rangeAtEnd && atBottom) {
      if (!unreadInfo) {
        markAsRead(room.roomId);
        return;
      }
      const evtTimeline = getEventTimeline(room, unreadInfo.readUptoEventId);
      const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
      if (latestTimeline === room.getLiveTimeline()) {
        markAsRead();
        setUnreadInfo(undefined);
      }
    }
  }, [room, unreadInfo, liveTimelineLinked, rangeAtEnd, atBottom]);

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
    setUnreadInfo(undefined);
  };

  const handleReplyClick: MouseEventHandler<HTMLButtonElement> = useCallback(
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

  const handleAvatarClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const avatarId = evt.currentTarget.getAttribute('data-avatar-id');
      openProfileViewer(avatarId, room.roomId);
    },
    [room]
  );

  const renderBody = (body: string, customBody?: string) => {
    if (body === '') <MessageEmptyContent />;
    if (customBody) {
      if (customBody === '') <MessageEmptyContent />;
      return parse(sanitizeCustomHtml(customBody), htmlReactParserOptions);
    }
    return <Linkify options={LINKIFY_OPTS}>{body}</Linkify>;
  };

  const renderRoomMsgContent = useRoomMsgContentRenderer<[EventTimelineSet]>({
    renderText: (mEventId, mEvent, timelineSet) => {
      const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
      const { body, formatted_body: customBody }: Record<string, unknown> =
        editedEvent?.getContent()['m.new.content'] ?? mEvent.getContent();

      if (typeof body !== 'string') return null;
      return (
        <Text
          as="div"
          style={{
            whiteSpace: typeof customBody === 'string' ? 'initial' : 'pre-wrap',
            wordBreak: 'break-word',
          }}
          priority="400"
        >
          {renderBody(body, typeof customBody === 'string' ? customBody : undefined)}
          {!!editedEvent && <MessageEditedContent />}
        </Text>
      );
    },
    renderEmote: (mEventId, mEvent, timelineSet) => {
      const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
      const { body, formatted_body: customBody } =
        editedEvent?.getContent()['m.new.content'] ?? mEvent.getContent();
      const senderId = mEvent.getSender() ?? '';

      const senderDisplayName =
        getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
      return (
        <Text
          as="div"
          style={{
            color: color.Success.Main,
            fontStyle: 'italic',
            whiteSpace: customBody ? 'initial' : 'pre-wrap',
            wordBreak: 'break-word',
          }}
          priority="400"
        >
          <b>{`${senderDisplayName} `}</b>
          {renderBody(body, typeof customBody === 'string' ? customBody : undefined)}
          {!!editedEvent && <MessageEditedContent />}
        </Text>
      );
    },
    renderNotice: (mEventId, mEvent, timelineSet) => {
      const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
      const { body, formatted_body: customBody }: Record<string, unknown> =
        editedEvent?.getContent()['m.new.content'] ?? mEvent.getContent();

      if (typeof body !== 'string') return null;
      return (
        <Text
          as="div"
          style={{
            whiteSpace: typeof customBody === 'string' ? 'initial' : 'pre-wrap',
            wordBreak: 'break-word',
          }}
          priority="300"
        >
          {renderBody(body, typeof customBody === 'string' ? customBody : undefined)}
          {!!editedEvent && <MessageEditedContent />}
        </Text>
      );
    },
    renderImage: (mEventId, mEvent) => {
      const content = mEvent.getContent<IImageContent>();
      const imgInfo = content?.info;
      const mxcUrl = content.file?.url ?? content.url;
      if (!imgInfo || typeof imgInfo.mimetype !== 'string' || typeof mxcUrl !== 'string') {
        if (mxcUrl) {
          return fileRenderer(mEventId, mEvent);
        }
        return null;
      }
      const height = scaleYDimension(imgInfo.w || 400, 400, imgInfo.h || 400);

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
              mimeType={imgInfo.mimetype}
              url={mxcUrl}
              encInfo={content.file}
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
              loadThumbnail
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
    renderUnsupported: (mEventId, mEvent) => {
      if (mEvent.isRedacted()) {
        return (
          <Text>
            <MessageDeletedContent />
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
        return (
          <Text>
            <MessageDeletedContent />
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

  const renderMatrixEvent = useMatrixEventRenderer<[number, EventTimelineSet, boolean]>({
    renderRoomMessage: (mEventId, mEvent, item, timelineSet, collapse) => {
      const reactions = getEventReactions(timelineSet, mEventId);

      const { replyEventId } = mEvent;

      // FIXME: Fix encrypted msg not returning body
      const senderId = mEvent.getSender() ?? '';
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;

      const senderDisplayName =
        getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
      const senderAvatarMxc = getMemberAvatarMxc(room, senderId);

      const headerJSX = !collapse && (
        <Box
          gap="300"
          direction={messageLayout === 1 ? 'RowReverse' : 'Row'}
          justifyContent="SpaceBetween"
          alignItems="Baseline"
          grow="Yes"
        >
          <Text
            size={messageLayout === 2 ? 'T300' : 'T400'}
            style={{ color: colorMXID(senderId) }}
            truncate
          >
            <b>{senderDisplayName}</b>
          </Text>
          <Time ts={mEvent.getTs()} compact={messageLayout === 1} />
        </Box>
      );

      const avatarJSX = !collapse && messageLayout !== 1 && (
        <AvatarBase>
          <Avatar size="300" data-avatar-id={senderId} onClick={handleAvatarClick}>
            {senderAvatarMxc ? (
              <AvatarImage
                src={mx.mxcUrlToHttp(senderAvatarMxc, 48, 48, 'crop') ?? senderAvatarMxc}
              />
            ) : (
              <AvatarFallback
                style={{
                  background: colorMXID(senderId),
                  color: 'white',
                }}
              >
                <Text size="H4">{senderDisplayName[0]}</Text>
              </AvatarFallback>
            )}
          </Avatar>
        </AvatarBase>
      );

      const msgContentJSX = (
        <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }}>
          {replyEventId && (
            <Reply
              as="button"
              mx={mx}
              room={room}
              timelineSet={timelineSet}
              eventId={replyEventId}
              data-reply-id={replyEventId}
              onClick={handleReplyClick}
            />
          )}
          {renderRoomMsgContent(mEventId, mEvent, timelineSet)}
          {reactions && (
            <Reactions
              style={{
                margin: `${config.space.S200} 0 ${messageLayout === 2 ? 0 : config.space.S100}`,
              }}
              room={room}
              relations={reactions}
            />
          )}
        </Box>
      );

      return (
        <MessageBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          collapse={collapse}
          highlight={highlighted}
        >
          {messageLayout === 1 && <CompactLayout before={headerJSX}>{msgContentJSX}</CompactLayout>}
          {messageLayout === 2 && (
            <BubbleLayout before={avatarJSX}>
              {headerJSX}
              {msgContentJSX}
            </BubbleLayout>
          )}
          {messageLayout !== 1 && messageLayout !== 2 && (
            <ModernLayout before={avatarJSX}>
              {headerJSX}
              {msgContentJSX}
            </ModernLayout>
          )}
        </MessageBase>
      );
    },
    renderSticker: (mEventId, mEvent, item, timelineSet) => {
      const reactions = getEventReactions(timelineSet, mEventId);
      const senderId = mEvent.getSender() ?? '';
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;

      const senderDisplayName =
        getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
      const senderAvatarMxc = getMemberAvatarMxc(room, senderId);
      const headerJSX = (
        <Box
          gap="300"
          direction={messageLayout === 1 ? 'RowReverse' : 'Row'}
          justifyContent="SpaceBetween"
          alignItems="Baseline"
          grow="Yes"
        >
          <Text
            size={messageLayout === 2 ? 'T300' : 'T400'}
            style={{ color: colorMXID(senderId) }}
            truncate
          >
            <b>{senderDisplayName}</b>
          </Text>
          <Time ts={mEvent.getTs()} compact={messageLayout === 1} />
        </Box>
      );

      const avatarJSX = messageLayout !== 1 && (
        <AvatarBase>
          <Avatar size="300" data-avatar-id={senderId} onClick={handleAvatarClick}>
            {senderAvatarMxc ? (
              <AvatarImage
                src={mx.mxcUrlToHttp(senderAvatarMxc, 48, 48, 'crop') ?? senderAvatarMxc}
              />
            ) : (
              <AvatarFallback
                style={{
                  background: colorMXID(senderId),
                  color: 'white',
                }}
              >
                <Text size="H4">{senderDisplayName[0]}</Text>
              </AvatarFallback>
            )}
          </Avatar>
        </AvatarBase>
      );

      const content = mEvent.getContent<IImageContent>();
      const imgInfo = content?.info;
      const mxcUrl = content.file?.url ?? content.url;
      if (!imgInfo || typeof imgInfo.mimetype !== 'string' || typeof mxcUrl !== 'string') {
        return null;
      }
      const height = scaleYDimension(imgInfo.w || 152, 152, imgInfo.h || 152);
      const msgContentJSX = (
        <Box direction="Column" alignSelf="Start" style={{ maxWidth: '100%' }}>
          <AttachmentBox
            style={{
              height: toRem(height < 48 ? 48 : height),
              width: toRem(152),
            }}
          >
            <ImageContent
              autoPlay
              body={content.body || 'Image'}
              info={imgInfo}
              mimeType={imgInfo.mimetype}
              url={mxcUrl}
              encInfo={content.file}
            />
          </AttachmentBox>

          {reactions && (
            <Reactions
              style={{
                margin: `${config.space.S200} 0 ${messageLayout === 2 ? 0 : config.space.S100}`,
              }}
              room={room}
              relations={reactions}
            />
          )}
        </Box>
      );

      return (
        <MessageBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          highlight={highlighted}
        >
          {messageLayout === 1 && <CompactLayout before={headerJSX}>{msgContentJSX}</CompactLayout>}
          {messageLayout === 2 && (
            <BubbleLayout before={avatarJSX}>
              {headerJSX}
              {msgContentJSX}
            </BubbleLayout>
          )}
          {messageLayout !== 1 && messageLayout !== 2 && (
            <ModernLayout before={avatarJSX}>
              {headerJSX}
              {msgContentJSX}
            </ModernLayout>
          )}
        </MessageBase>
      );
    },
    renderRoomMember: (mEventId, mEvent, item) => {
      const membershipChanged =
        mEvent.getContent().membership !== mEvent.getPrevContent().membership;
      if (membershipChanged && hideMembershipEvents) return null;
      if (!membershipChanged && hideNickAvatarEvents) return null;

      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const parsed = parseMemberEvent(mEvent);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <EventBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          highlight={highlighted}
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
        </EventBase>
      );
    },
    renderRoomName: (mEventId, mEvent, item) => {
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <EventBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          highlight={highlighted}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            iconSrc={Icons.Hash}
            content={
              <Box grow="Yes" direction="Column">
                <Text size="T300" priority="300">
                  <b>{senderName}</b>
                  {' changed room name'}
                </Text>
              </Box>
            }
          />
        </EventBase>
      );
    },
    renderRoomTopic: (mEventId, mEvent, item) => {
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <EventBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          highlight={highlighted}
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
        </EventBase>
      );
    },
    renderRoomAvatar: (mEventId, mEvent, item) => {
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <EventBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          highlight={highlighted}
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
        </EventBase>
      );
    },
    renderStateEvent: (mEventId, mEvent, item) => {
      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <EventBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          highlight={highlighted}
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
        </EventBase>
      );
    },
    renderEvent: (mEventId, mEvent, item) => {
      if (Object.keys(mEvent.getContent()).length === 0) return null;
      if (mEvent.getRelation()) return null;
      if (mEvent.isRedaction()) return null;

      const highlighted = focusItem.current?.index === item && focusItem.current.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = <Time ts={mEvent.getTs()} compact={messageLayout === 1} />;

      return (
        <EventBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          highlight={highlighted}
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
        </EventBase>
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

    if (!newDivider) {
      newDivider = prevEvent?.getId() === readUptoEventIdRef.current;
    }
    if (!dayDivider) {
      dayDivider = prevEvent ? !inSameDay(prevEvent.getTs(), mEvent.getTs()) : false;
    }

    const collapsed =
      isPrevRendered &&
      !dayDivider &&
      !newDivider &&
      prevEvent !== undefined &&
      prevEvent.getSender() === mEvent.getSender() &&
      prevEvent.getType() === mEvent.getType() &&
      minuteDifference(prevEvent.getTs(), mEvent.getTs()) < 2;

    const eventJSX = mEvent.isRelation()
      ? null
      : renderMatrixEvent(mEventId, mEvent, item, timelineSet, collapsed);
    prevEvent = mEvent;
    isPrevRendered = !!eventJSX;

    const newDividerJSX =
      newDivider && eventJSX && mEvent.getSender() !== mx.getUserId() ? (
        <MessageBase space={messageSpacing}>
          <TimelineDivider style={{ color: color.Success.Main }} variant="Inherit">
            <Badge as="span" size="500" variant="Success" fill="Solid" radii="300">
              <Text size="L400">Unread Messages</Text>
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
                  if (today(mEvent.getTs())) return 'Today';
                  if (yesterday(mEvent.getTs())) return 'Yesterday';
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
            <Text size="L400">Jump to Unread</Text>
          </Chip>

          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.CheckTwice} />}
            onClick={handleMarkAsRead}
          >
            <Text size="L400">Mark as Read</Text>
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
      {(atBottom === false || !liveTimelineLinked || !rangeAtEnd) && (
        <TimelineFloat position="Bottom">
          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.ArrowBottom} />}
            onClick={handleJumpToLatest}
          >
            <Text size="L400">Jump to Latest</Text>
          </Chip>
        </TimelineFloat>
      )}
    </Box>
  );
}
