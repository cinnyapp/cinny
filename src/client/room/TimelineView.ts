import { ObservableValue } from 'neurone/lib/utils/observable';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { MessageBatch, MessageRange } from './messages';
import { RelationsProcessor } from './relations';
import { LocalEventOutbox } from './local-event/LocalEventOutbox';
import { LocalEventSender, LocalMessage } from './local-event';

export type JumpTarget =
  | { type: 'main'; eventId: string }
  | { type: 'thread'; threadId: string; eventId: string };

export interface TimelineView {
  readonly batch: ObservableValue<MessageBatch>;
  readonly range: MessageRange;
  readonly outbox: LocalEventOutbox;
  readonly relations: RelationsProcessor;
  paginateBackward(limit: number): Promise<void>;
  paginateForward(limit: number): Promise<void>;
  jumpToEvent(eventId: string): Promise<JumpTarget>;
  jumpToOldest(): Promise<void>;
  jumpToLatest(): Promise<void>;
  findEvent(eventId: string): MessageEventWithoutRoomId | undefined;
  findIndex(eventId: string): number;
  findFirstUnread(userId: string, readEventTs: number): MessageEventWithoutRoomId | undefined;
  sendMessage(
    originalMessage: LocalMessage,
    wireMessage: LocalMessage,
    txnId: string
  ): Promise<LocalEventSender>;
}
