import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { rContent, rUnsigned, rEvent, rRelatesTo, rRelations } from '../../reader';
import { RelationType } from '../../../types/matrix/common';

export const getRedactedEventId = (event: MessageEventWithoutRoomId): string | undefined => {
  const { content } = event;

  return rEvent.redacts(event) ?? rContent.redacts(content);
};

export const redacted = (event: MessageEventWithoutRoomId): boolean => {
  const { unsigned } = event;

  return rUnsigned.redactedBecause(unsigned) !== undefined;
};

export const replaced = (
  event: MessageEventWithoutRoomId
): MessageEventWithoutRoomId | undefined => {
  const { unsigned } = event;

  const relations = rUnsigned.relations(unsigned);
  const replacementEvent = rRelations.replace(relations);

  return replacementEvent as MessageEventWithoutRoomId | undefined;
};

export const relation = (event: MessageEventWithoutRoomId): boolean =>
  rRelatesTo.relType(rContent.relatesTo(event.content)) !== undefined;

export const replacement = (event: MessageEventWithoutRoomId): boolean => {
  const { content } = event;

  return (
    rRelatesTo.relType(rContent.relatesTo(content)) === RelationType.Replace &&
    rRelatesTo.eventId(rContent.relatesTo(content)) !== undefined
  );
};

export const reference = (event: MessageEventWithoutRoomId): boolean => {
  const { content } = event;

  return (
    rRelatesTo.relType(rContent.relatesTo(content)) === RelationType.Reference &&
    rRelatesTo.eventId(rContent.relatesTo(content)) !== undefined
  );
};
