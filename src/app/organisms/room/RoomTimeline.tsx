import React, {
  Dispatch,
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
  EventTimelineSetHandlerMap,
  EventType,
  MatrixClient,
  MatrixEvent,
  RelationType,
  Room,
  RoomEvent,
} from 'matrix-js-sdk';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import to from 'await-to-js';
import { Box, Scroll, Text, color, config } from 'folds';
import Linkify from 'linkify-react';
import { getMxIdLocalPart } from '../../utils/matrix';
import colorMXID from '../../../util/colorMXID';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVirtualPaginator, ItemRange } from '../../hooks/useVirtualPaginator';
import { useAlive } from '../../hooks/useAlive';
import { scrollToBottom } from '../../utils/dom';
import { CompactMessagePlaceholder, Reaction } from '../../components/message';
import { CompactMessage } from '../../components/message/CompactMessage';
import { LINKIFY_OPTS, getReactCustomHtmlParser } from '../../plugins/react-custom-html-parser';
import { getMemberDisplayName } from '../../utils/room';

export const getLiveTimeline = (room: Room): EventTimeline =>
  room.getUnfilteredTimelineSet().getLiveTimeline();

export const getEventTimeline = (room: Room, eventId: string): EventTimeline | undefined => {
  const timelineSet = room.getUnfilteredTimelineSet();
  return timelineSet.getTimelineForEvent(eventId) ?? undefined;
};

export const fetchEventTimeline = (mx: MatrixClient, room: Room, eventId: string) =>
  mx.getEventTimeline(room.getUnfilteredTimelineSet(), eventId);

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

export const getTimelinesTotalLength = (timelines: EventTimeline[]): number =>
  timelines.reduce((length, tm) => length + tm.getEvents().length, 0);

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

type RoomTimelineProps = {
  room: Room;
  eventId?: string;
};

const PAGINATION_LIMIT = 80;

type Timeline = {
  linkedTimelines: EventTimeline[];
  range: ItemRange;
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

  const handleTimelinePagination = useCallback(
    async (backwards: boolean) => {
      const { linkedTimelines: lTimelines } = timelineRef.current;
      const oldLength = getTimelinesTotalLength(lTimelines);
      const timelineToPaginate = backwards ? lTimelines[0] : lTimelines[lTimelines.length - 1];

      const paginationToken = timelineToPaginate.getPaginationToken(
        backwards ? Direction.Backward : Direction.Forward
      );
      if (!paginationToken) return;

      await to(
        mx.paginateEventTimeline(timelineToPaginate, {
          backwards,
          limit,
        })
      );
      if (alive()) {
        const newLTimelines = getLinkedTimelines(timelineToPaginate);
        const newLength = getTimelinesTotalLength(newLTimelines);
        const lengthDiff = Math.max(newLength - oldLength, 0);

        setTimeline((currentTimeline) => ({
          linkedTimelines: newLTimelines,
          range: backwards
            ? {
                start: currentTimeline.range.start + lengthDiff,
                end: currentTimeline.range.end + lengthDiff,
              }
            : currentTimeline.range,
        }));
      }
    },
    [mx, alive, setTimeline, limit]
  );
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventArriveCountRef = useRef(0);

  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () => getReactCustomHtmlParser(mx, room),
    [mx, room]
  );

  const [timeline, setTimeline] = useState<Timeline>(() => {
    const linkedTimelines = eventId ? [] : getLinkedTimelines(getLiveTimeline(room));
    const evLength = getTimelinesTotalLength(linkedTimelines);
    return {
      linkedTimelines,
      range: {
        start: Math.max(evLength - PAGINATION_LIMIT, 0),
        end: evLength,
      },
    };
  });
  const eventsLength = getTimelinesTotalLength(timeline.linkedTimelines);
  const liveTimelineLinked =
    timeline.linkedTimelines[timeline.linkedTimelines.length - 1] === getLiveTimeline(room);
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

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) scrollToBottom(scrollEl);
  }, []);

  const eventArriveCount = eventArriveCountRef.current;
  useEffect(() => {
    if (eventArriveCount > 0) {
      const scrollEl = scrollRef.current;
      if (scrollEl) scrollToBottom(scrollEl, 'smooth');
    }
  }, [eventArriveCount]);

  const reactionRenderer = useCallback(
    ([key, events]: [string, Set<MatrixEvent>]) => {
      const isPressed = !!Array.from(events).find((ev) => ev.getSender() === mx.getUserId());
      return (
        <Reaction aria-pressed={isPressed} key={key} mx={mx} reaction={key} count={events.size} />
      );
    },
    [mx]
  );

  return (
    <Box style={{ height: '100%', color: color.Surface.OnContainer }} grow="Yes">
      <Scroll ref={scrollRef}>
        <Box
          direction="Column"
          justifyContent="End"
          style={{ minHeight: '100%', padding: `${config.space.S200} 0` }}
        >
          {timeline.linkedTimelines[0].getPaginationToken(Direction.Backward) && (
            <>
              <CompactMessagePlaceholder />
              <CompactMessagePlaceholder />
              <CompactMessagePlaceholder />
              <CompactMessagePlaceholder />
              <CompactMessagePlaceholder />
            </>
          )}
          <div style={{ height: 1 }} ref={paginator.observeBackAnchor} />
          {paginator.getItems().map((item) => {
            const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(
              timeline.linkedTimelines,
              item
            );
            if (!eventTimeline) return null;
            const timelineSet = eventTimeline?.getTimelineSet();
            const mEvent = getTimelineEvent(
              eventTimeline,
              getTimelineRelativeIndex(item, baseIndex)
            );
            const mEventId = mEvent?.getId();

            if (!mEvent || !mEventId) return null;

            const reactions = timelineSet.relations.getChildEventsForEvent(
              mEventId,
              RelationType.Annotation,
              EventType.Reaction
            );
            const { body } = mEvent.getContent();
            if (!body) return null;
            const customBody = mEvent.getContent().formatted_body;
            const senderId = mEvent.getSender() ?? '';

            return (
              <CompactMessage key={mEvent.getId()} data-message-item={item}>
                <Box
                  style={{
                    position: 'sticky',
                    top: config.space.S100,
                    maxWidth: 170,
                    width: '100%',
                  }}
                  gap="200"
                  shrink="No"
                  justifyContent="SpaceBetween"
                  alignItems="Baseline"
                >
                  <Text style={{ flexShrink: 0 }} size="T200" priority="300">
                    {new Date(mEvent.getTs()).toLocaleTimeString()}
                  </Text>
                  <Text truncate style={{ color: colorMXID(senderId) }}>
                    <b>{getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId)}</b>
                  </Text>
                </Box>
                <Box
                  // grow="Yes"
                  direction="Column"
                  // style={{
                  //   borderRadius: 8,
                  //   padding: '8px 12px',
                  //   backgroundColor: color.SurfaceVariant.Container,
                  // }}
                >
                  <Text as="div" style={{ whiteSpace: customBody ? 'initial' : 'pre-wrap' }}>
                    {customBody ? (
                      parse(sanitizeCustomHtml(customBody), htmlReactParserOptions)
                    ) : (
                      <Linkify options={LINKIFY_OPTS}>{body}</Linkify>
                    )}
                  </Text>
                  <Box gap="200" wrap="Wrap" style={{ marginTop: config.space.S100 }}>
                    {reactions?.getSortedAnnotationsByKey()?.map(reactionRenderer)}
                  </Box>
                </Box>
              </CompactMessage>
            );
          })}

          {(!liveTimelineLinked || !rangeAtEnd) && (
            <>
              <CompactMessagePlaceholder ref={paginator.observeFrontAnchor} />
              <CompactMessagePlaceholder />
              <CompactMessagePlaceholder />
              <CompactMessagePlaceholder />
              <CompactMessagePlaceholder />
            </>
          )}
        </Box>
      </Scroll>
    </Box>
  );
}
