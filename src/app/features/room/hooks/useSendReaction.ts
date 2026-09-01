import { useCallback, useEffect, useState } from 'react';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { ReactionContent, RelationType } from '../../../../types/matrix/common';
import { MessageEvent } from '../../../../types/matrix/room';
import { useClient } from '../../../hooks/useClient';
import {
  EventSenderError,
  EventSenderIdle,
  EventSenderSuccess,
  LocalEvent,
  LocalEventSender,
  LocalMessage,
} from '../../../../client/room/local-event';
import { useRoom } from '../../../hooks/useRoom';

export const useSendReaction = (
  reactions: Map<string, MessageEventWithoutRoomId<ReactionContent>[]>,
  redacted: Set<string>
) => {
  const ct = useClient();
  const roomId = useRoom();
  const [reactionSender, setReactionSender] = useState<LocalEventSender<ReactionContent>>();

  const hasExistingReaction = useCallback(
    (targetEventId: string, key: string) => {
      const eventReactions = reactions.get(targetEventId)?.filter((r) => !redacted.has(r.event_id));
      return eventReactions?.some(
        (evt) => evt.sender === ct.session.userId && evt.content['m.relates_to'].key === key
      );
    },
    [reactions, redacted, ct]
  );

  const handleAddReaction = useCallback(
    (targetEventId: string, key: string, shortcode?: string) => {
      if (hasExistingReaction(targetEventId, key)) {
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
      setReactionSender(eventSender);
    },
    [ct, roomId, hasExistingReaction]
  );

  useEffect(() => {
    const unsub = reactionSender?.state.subscribe((state) => {
      if (state instanceof EventSenderError || state instanceof EventSenderIdle) {
        setReactionSender(undefined);
      }
    });
    return () => {
      unsub?.();
    };
  }, [reactionSender]);

  const sendingRel = reactionSender?.localEvent.original.content['m.relates_to'];
  const senderRedacted =
    reactionSender?.state.read instanceof EventSenderSuccess &&
    redacted.has(reactionSender.state.read.eventId);

  return {
    reactionSender:
      (sendingRel && hasExistingReaction(sendingRel.event_id, sendingRel.key)) || senderRedacted
        ? undefined
        : reactionSender,
    handleAddReaction,
  };
};
