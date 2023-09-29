import React, { useCallback } from 'react';
import { Box, Text, Tooltip, TooltipProvider, as, toRem } from 'folds';
import { EventTimelineSet, EventType, MatrixEvent, RelationType, Room } from 'matrix-js-sdk';
import { type Relations } from 'matrix-js-sdk/lib/models/relations';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { factoryEventSentBy } from '../../../utils/matrix';
import { Reaction, ReactionTooltipMsg } from '../../../components/message';
import { getReactionContent } from '../../../utils/room';
import { useRelations } from '../../../hooks/useRelations';
import { MessageEvent } from '../../../../types/matrix/room';

export const getEventReactions = (timelineSet: EventTimelineSet, eventId: string) =>
  timelineSet.relations.getChildEventsForEvent(
    eventId,
    RelationType.Annotation,
    EventType.Reaction
  );

export type ReactionsProps = {
  room: Room;
  relations: Relations;
};
export const Reactions = as<'div', ReactionsProps>(({ room, relations, ...props }, ref) => {
  const mx = useMatrixClient();
  const myUserId = mx.getUserId();
  const reactions = useRelations(
    relations,
    useCallback((rel) => [...(rel.getSortedAnnotationsByKey() ?? [])], [])
  );

  const sendReaction = (key: string, rEvent: MatrixEvent) => {
    const { shortcode } = rEvent.getContent();
    const toEventId = rEvent.getRelation()?.event_id;
    if (typeof toEventId !== 'string') return;
    mx.sendEvent(room.roomId, MessageEvent.Reaction, getReactionContent(toEventId, key, shortcode));
  };

  return (
    <Box gap="200" wrap="Wrap" {...props} ref={ref}>
      {reactions.map(([key, events]) => {
        const rEvents = Array.from(events);
        if (rEvents.length === 0) return null;
        const reaction = rEvents[0];
        const myREvent = myUserId ? rEvents.find(factoryEventSentBy(myUserId)) : undefined;
        const isPressed = !!myREvent?.getRelation();

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
                onClick={() =>
                  myREvent && isPressed
                    ? mx.redactEvent(room.roomId, myREvent.getId() ?? '')
                    : sendReaction(key, reaction)
                }
              />
            )}
          </TooltipProvider>
        );
      })}
    </Box>
  );
});
