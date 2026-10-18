import { ObservableValue } from 'neurone/lib/utils/observable';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { EventSenderSuccess, LocalEventSender } from './LocalEventSender';
import { randomStr } from '../../../app/utils/common';
import { rUnsigned } from '../../reader';

export class LocalEventOutbox {
  private readonly publishKey = randomStr();

  public readonly senders: ObservableValue<readonly LocalEventSender[]>;

  constructor() {
    this.senders = new ObservableValue([], this.publishKey);
  }

  private get items(): readonly LocalEventSender[] {
    return this.senders.read;
  }

  public add(sender: LocalEventSender): LocalEventSender {
    const n = this.items.filter((s) => s !== sender);
    n.push(sender);
    this.senders.publish(this.publishKey, n);

    return sender;
  }

  public remove(sender: LocalEventSender): void {
    const index = this.items.indexOf(sender);

    if (index === -1) {
      return;
    }

    const n = this.items.filter((s) => s !== sender);
    this.senders.publish(this.publishKey, n);
  }

  public handleRemoteEcho(events: MessageEventWithoutRoomId[]): void {
    const waitingSenders = this.items.filter((sender) => {
      const { txnId } = sender.localEvent;
      const eventId =
        sender.state.read instanceof EventSenderSuccess ? sender.state.read.eventId : undefined;

      const received = events.some(
        (event) => rUnsigned.transactionId(event.unsigned) === txnId || event.event_id === eventId
      );

      return !received;
    });

    if (waitingSenders.length === this.items.length) {
      return;
    }
    this.senders.publish(this.publishKey, waitingSenders);
  }
}
