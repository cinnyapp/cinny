import { useCallback } from 'react';
import { ReactionContent, RelationType } from '../../../../types/matrix/common';
import { MessageEvent } from '../../../../types/matrix/room';
import { useClient } from '../../../hooks/useClient';
import {
  EventSenderIdle,
  LocalEvent,
  LocalEventSender,
  LocalMessage,
} from '../../../../client/room/local-event';
import { useRoom } from '../../../hooks/useRoom';
import { useTimelineView } from './useTimeline';

export const useSendReaction = () => {
  const ct = useClient();
  const roomId = useRoom();
  const timeline = useTimelineView();

  const handleAddReaction = useCallback(
    (targetEventId: string, key: string, shortcode?: string) => {
      const redacted = timeline.relations.redacted.read;
      const reactions = timeline.relations.reactions.eventToRelations.read
        .get(targetEventId)
        ?.filter((r) => !redacted.has(r.event_id));
      if (
        reactions?.some(
          (evt) => evt.sender === ct.session.userId && evt.content['m.relates_to'].key === key
        )
      ) {
        // Already reacted with this emoji
        return;
      }

      const content: ReactionContent = {
        'm.relates_to': {
          event_id: targetEventId,
          key,
          rel_type: RelationType.Annotation,
        },
        shortcode,
      };

      const localMessage = new LocalMessage(roomId, MessageEvent.Reaction, content);
      const txnId = ct.getTxnId();
      const localEvent = new LocalEvent(localMessage, localMessage, txnId, Date.now());
      const eventSender = new LocalEventSender(localEvent, ct.requestAuthJSON);

      if (eventSender.state.read instanceof EventSenderIdle) {
        eventSender.state.read.send();
      }
    },
    [ct, roomId, timeline]
  );

  return handleAddReaction;
};
