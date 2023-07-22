import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Direction, EventTimeline, MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import parse from 'html-react-parser';
import to from 'await-to-js';
import { Box, Line, Scroll, Text, color, config } from 'folds';
import { getMxIdLocalPart } from '../../utils/matrix';
import colorMXID from '../../../util/colorMXID';
import { sanitizeCustomHtml } from '../../../util/sanitize';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVirtualPaginator, ItemRange } from '../../hooks/useVirtualPaginator';
import { useAlive } from '../../hooks/useAlive';

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

export function RoomTimeline({ room, eventId }: RoomTimelineProps) {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    scrollEl.scrollTo({
      top: Math.round(scrollEl.scrollHeight - scrollEl.offsetHeight),
    });
  }, []);

  return (
    <Box style={{ height: '100%', color: color.Surface.OnContainer }} grow="Yes">
      <Scroll ref={scrollRef}>
        <Box direction="Column" justifyContent="End" style={{ minHeight: '100%' }}>
          <div style={{ height: 1 }} ref={paginator.observeBackAnchor} />
          {paginator.getItems().map((item) => {
            const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(
              timeline.linkedTimelines,
              item
            );
            const mEvent =
              eventTimeline &&
              getTimelineEvent(eventTimeline, getTimelineRelativeIndex(item, baseIndex));

            if (!mEvent) return null;

            const { body } = mEvent.getContent();
            if (!body) return null;
            const customBody = mEvent.getContent().formatted_body;
            return (
              <div
                style={{
                  padding: '4px 16px',
                }}
                key={mEvent.getId()}
                data-message-item={item}
              >
                <Box gap="200">
                  <Text
                    truncate
                    align="Right"
                    style={{
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                      position: 'sticky',
                      top: config.space.S100,
                      width: '100%',
                      maxWidth: 120,
                      color: colorMXID(mEvent.getSender()),
                    }}
                  >
                    <b>{getMxIdLocalPart(mEvent?.getSender() ?? '')}</b>
                  </Text>
                  <Line
                    style={{
                      margin: ` ${config.space.S100} 0`,
                      borderColor: colorMXID(mEvent.getSender()),
                    }}
                    direction="Vertical"
                    size="400"
                  />
                  <Text as="div">
                    {customBody ? parse(sanitizeCustomHtml(mx, customBody)) : body}
                  </Text>
                </Box>
              </div>
            );
          })}

          <div style={{ height: 1 }} ref={paginator.observeFrontAnchor} />
        </Box>
      </Scroll>
    </Box>
  );
}
