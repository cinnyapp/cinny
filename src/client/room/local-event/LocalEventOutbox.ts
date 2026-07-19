import { ObservableValue } from 'neurone/lib/utils/observable';
import { EventSenderSuccess, LocalEventSender } from './LocalEventSender';

export class LocalEventOutbox {
  private readonly publishKey = crypto.randomUUID();

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

  public removeByEventIds(eventIds: readonly string[]): void {
    const ids = new Set(eventIds);

    const n = this.items.filter(
      (s) => !(s.state.read instanceof EventSenderSuccess && ids.has(s.state.read.eventId))
    );
    if (n.length === this.items.length) {
      return;
    }
    this.senders.publish(this.publishKey, n);
  }

  public getSentEventIds(): string[] {
    return this.items
      .map((s) => (s.state.read instanceof EventSenderSuccess ? s.state.read.eventId : undefined))
      .filter<string>((eId): eId is string => typeof eId === 'string');
  }
}
