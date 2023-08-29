import React, {
  Dispatch,
  MouseEventHandler,
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
import to from 'await-to-js';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Box,
  Scroll,
  Text,
  Tooltip,
  TooltipProvider,
  color,
  config,
  toRem,
} from 'folds';
import Linkify from 'linkify-react';
import {
  decryptFile,
  factoryEventSentBy,
  getMxIdLocalPart,
  matrixEventByRecency,
} from '../../utils/matrix';
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
  Reaction,
  ReactionTooltipMsg,
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
import { scaleYDimension } from '../../utils/common';
import { useMatrixEventRenderer } from '../../hooks/useMatrixEventRenderer';
import { useRoomMsgContentRenderer } from '../../hooks/useRoomMsgContentRenderer';
import { IAudioContent, IImageContent, IVideoContent } from '../../../types/matrix/common';
import { getBlobSafeMimeType } from '../../utils/mimeTypes';
import { ImageContent, VideoContent, FileHeader, fileRenderer, AudioContent } from './message';

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

const useLiveEventArrive = (mx: MatrixClient, roomId: string | undefined, onArrive: () => void) => {
  useEffect(() => {
    const handleTimelineEvent: EventTimelineSetHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      eventRoom,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (eventRoom?.roomId !== roomId || !data.liveEvent) return;
      onArrive();
    };

    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [mx, roomId, onArrive]);
};

export function RoomTimeline({ room, eventId }: RoomTimelineProps) {
  const mx = useMatrixClient();
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventArriveCountRef = useRef(0);
  const highlightItem = useRef<{
    index: number;
    scrollTo: boolean;
  }>();
  const alive = useAlive();
  const [, forceUpdate] = useForceUpdate();

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () => getReactCustomHtmlParser(mx, room),
    [mx, room]
  );

  const [timeline, setTimeline] = useState<Timeline>(() => {
    const linkedTimelines = eventId ? [] : getLinkedTimelines(getLiveTimeline(room));
    const evLength = getTimelinesEventsCount(linkedTimelines);
    return {
      linkedTimelines,
      range: {
        start: Math.max(evLength - PAGINATION_LIMIT, 0),
        end: evLength,
      },
    };
  });
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

  const paginator = useVirtualPaginator({
    count: eventsLength,
    limit: PAGINATION_LIMIT,
    range: timeline.range,
    onRangeChange: useCallback((r) => setTimeline((cs) => ({ ...cs, range: r })), []),
    getScrollElement: useCallback(() => scrollRef.current, []),
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

        highlightItem.current = {
          index: evtAbsIndex,
          scrollTo: true,
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
      const lTimelines = getLinkedTimelines(getLiveTimeline(room));
      const evLength = getTimelinesEventsCount(lTimelines);
      setTimeline({
        linkedTimelines: lTimelines,
        range: {
          start: Math.max(evLength - PAGINATION_LIMIT, 0),
          end: evLength,
        },
      });
    }, [alive, room])
  );

  useLiveEventArrive(
    mx,
    liveTimelineLinked && rangeAtEnd ? room.roomId : undefined,
    useCallback(() => {
      const { offsetHeight = 0, scrollTop = 0, scrollHeight = 0 } = scrollRef.current ?? {};
      const scrollBottom = scrollTop + offsetHeight;
      if (Math.round(scrollHeight - scrollBottom) > 100) {
        setTimeline((ct) => ({ ...ct }));
        return;
      }
      eventArriveCountRef.current += 1;
      setTimeline((ct) => ({
        ...ct,
        range: {
          start: ct.range.start + 1,
          end: ct.range.end + 1,
        },
      }));
    }, [])
  );

  useEffect(() => {
    if (eventId) {
      loadEventTimeline(eventId);
    }
  }, [eventId, loadEventTimeline]);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) scrollToBottom(scrollEl);
  }, []);

  const highlightItm = highlightItem.current;
  useLayoutEffect(() => {
    if (highlightItm && highlightItm.scrollTo) {
      paginator.scrollToItem(highlightItm.index, {
        behavior: 'instant',
        align: 'center',
        stopInView: true,
      });
    }
    // FIXME: remove it with timer
    // because it remove highlight if state update happen just after highlight update
    highlightItem.current = undefined;
  }, [highlightItm, paginator]);

  const eventArriveCount = eventArriveCountRef.current;
  useEffect(() => {
    if (eventArriveCount > 0) {
      const scrollEl = scrollRef.current;
      if (scrollEl) scrollToBottom(scrollEl, 'smooth');
    }
  }, [eventArriveCount]);

  const handleReplyClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (evt) => {
      const replyId = evt.currentTarget.getAttribute('data-reply-id');
      if (typeof replyId !== 'string') return;
      const replyTimeline = getEventTimeline(room, replyId);
      const absoluteIndex =
        replyTimeline && getEventIdAbsoluteIndex(timeline.linkedTimelines, replyTimeline, replyId);

      if (typeof absoluteIndex === 'number') {
        paginator.scrollToItem(absoluteIndex, {
          behavior: 'smooth',
          align: 'center',
          stopInView: true,
        });
        highlightItem.current = {
          index: absoluteIndex,
          scrollTo: false,
        };
        forceUpdate();
      } else {
        setTimeline({
          range: { start: 0, end: 0 },
          linkedTimelines: [],
        });
        loadEventTimeline(replyId);
      }
    },
    [room, timeline, paginator, loadEventTimeline, forceUpdate]
  );

  const handleAvatarClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const avatarId = evt.currentTarget.getAttribute('data-avatar-id');
      openProfileViewer(avatarId, room.roomId);
    },
    [room]
  );

  const reactionRenderer = useCallback(
    ([key, events]: [string, Set<MatrixEvent>]) => {
      const currentUserId = mx.getUserId();
      const rEvents = Array.from(events);
      const isPressed = !!(currentUserId && rEvents.find(factoryEventSentBy(currentUserId)));

      return (
        <TooltipProvider
          key={key}
          position="Top"
          tooltip={
            <Tooltip style={{ maxWidth: toRem(200) }}>
              <Text size="T300">
                <ReactionTooltipMsg room={room} reaction={key} events={rEvents} />
              </Text>
            </Tooltip>
          }
        >
          {(targetRef) => (
            <Reaction
              ref={targetRef}
              aria-pressed={isPressed}
              key={key}
              mx={mx}
              reaction={key}
              count={events.size}
            />
          )}
        </TooltipProvider>
      );
    },
    [mx, room]
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

  const renderMatrixEvent = useMatrixEventRenderer<
    [number, EventTimelineSet, MatrixEvent | undefined]
  >({
    renderRoomMessage: (mEventId, mEvent, item, timelineSet, prevEvent) => {
      const reactions = getEventReactions(timelineSet, mEventId);

      const { replyEventId } = mEvent;

      // FIXME: Fix encrypted msg not returning body
      const senderId = mEvent.getSender() ?? '';
      const collapsed = prevEvent?.getSender() === senderId;
      const highlighted = highlightItem.current?.index === item;

      const senderDisplayName =
        getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
      const senderAvatarMxc = getMemberAvatarMxc(room, senderId);

      const headerJSX = !collapsed && (
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
          <Text style={{ flexShrink: 0 }} size="T200" priority="300">
            {new Date(mEvent.getTs()).toLocaleTimeString()}
          </Text>
        </Box>
      );

      const avatarJSX = !collapsed && messageLayout !== 1 && (
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
            <Box
              gap="200"
              wrap="Wrap"
              style={{ margin: `${config.space.S200} 0 ${config.space.S100}` }}
            >
              {reactions.getSortedAnnotationsByKey()?.map(reactionRenderer)}
            </Box>
          )}
        </Box>
      );

      return (
        <MessageBase
          key={mEvent.getId()}
          data-message-item={item}
          space={messageSpacing}
          collapse={collapsed}
          highlight={highlighted}
        >
          {messageLayout === 1 && <CompactLayout header={headerJSX} content={msgContentJSX} />}
          {messageLayout === 2 && (
            <BubbleLayout avatar={avatarJSX} header={headerJSX} content={msgContentJSX} />
          )}
          {messageLayout !== 1 && messageLayout !== 2 && (
            <ModernLayout avatar={avatarJSX} header={headerJSX} content={msgContentJSX} />
          )}
        </MessageBase>
      );
    },
  });

  let prevEvent: MatrixEvent | undefined;
  const eventRenderer = (item: number) => {
    const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(timeline.linkedTimelines, item);
    if (!eventTimeline) return null;
    const timelineSet = eventTimeline?.getTimelineSet();
    const mEvent = getTimelineEvent(eventTimeline, getTimelineRelativeIndex(item, baseIndex));
    const mEventId = mEvent?.getId();

    if (!mEvent || !mEventId) return null;
    if (mEvent.isRelation()) {
      return null;
    }
    const eventJSX = renderMatrixEvent(mEventId, mEvent, item, timelineSet, prevEvent);
    if (eventJSX) {
      prevEvent = mEvent;
    }
    return eventJSX;
  };

  return (
    <Box style={{ height: '100%', color: color.Surface.OnContainer }} grow="Yes">
      <Scroll ref={scrollRef} visibility="Hover">
        <Box
          direction="Column"
          justifyContent="End"
          style={{ minHeight: '100%', padding: `${config.space.S500} 0` }}
        >
          {(canPaginateBack || !rangeAtStart) &&
            (messageLayout === 1 ? (
              <>
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder ref={paginator.observeBackAnchor} />
              </>
            ) : (
              <>
                <DefaultPlaceholder />
                <DefaultPlaceholder />
                <DefaultPlaceholder ref={paginator.observeBackAnchor} />
              </>
            ))}

          {paginator.getItems().map(eventRenderer)}

          {(!liveTimelineLinked || !rangeAtEnd) &&
            (messageLayout === 1 ? (
              <>
                <CompactPlaceholder ref={paginator.observeFrontAnchor} />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
                <CompactPlaceholder />
              </>
            ) : (
              <>
                <DefaultPlaceholder ref={paginator.observeFrontAnchor} />
                <DefaultPlaceholder />
                <DefaultPlaceholder />
              </>
            ))}
        </Box>
      </Scroll>
    </Box>
  );
}
