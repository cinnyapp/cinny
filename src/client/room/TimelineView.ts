import { ObservableValue } from 'neurone/lib/utils/observable';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { MessageBatch, MessageRange } from './messages';
import { RelationsProcessor } from './relations';
import { LocalEventOutbox } from './local-event/LocalEventOutbox';
import { LocalEventSender, LocalMessage } from './local-event';

export interface TimelineView {
  readonly batch: ObservableValue<MessageBatch>;
  readonly range: MessageRange;
  readonly outbox: LocalEventOutbox;
  readonly relations: RelationsProcessor;
  paginateBackward(limit: number): Promise<void>;
  paginateForward(limit: number): Promise<void>;
  findEvent(eventId: string): MessageEventWithoutRoomId | undefined;
  jumpToEvent(eventId: string): Promise<void>;
  jumpToLatest(): Promise<void>;
  sendMessage(
    originalMessage: LocalMessage,
    wireMessage: LocalMessage,
    txnId: string
  ): Promise<LocalEventSender>;
}
