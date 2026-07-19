import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';

export class Messages {
  public readonly events: MessageEventWithoutRoomId[];

  constructor(events: MessageEventWithoutRoomId[]) {
    this.events = Messages.sort(events);
  }

  public fork(): Messages {
    return new Messages(this.events);
  }

  public overlap(events: MessageEventWithoutRoomId[]): boolean {
    return events.some((e) => this.events.some((ev) => ev.event_id === e.event_id));
  }

  public mergeFork(events: MessageEventWithoutRoomId[]): Messages {
    const newEvents = Messages.sort(events);

    return Messages.merge(newEvents, this.events);
  }

  public get(eventId: string): MessageEventWithoutRoomId | undefined {
    return this.events.find((event) => event.event_id === eventId);
  }

  static sort(events: MessageEventWithoutRoomId[]): MessageEventWithoutRoomId[] {
    return [...events].sort((a, b) => a.origin_server_ts - b.origin_server_ts);
  }

  static merge(m1: MessageEventWithoutRoomId[], m2: MessageEventWithoutRoomId[]): Messages {
    const seen = new Set<string>();
    const merged: MessageEventWithoutRoomId[] = [];

    let i = 0;
    let j = 0;

    while (i < m1.length && j < m2.length) {
      const oldEvent = m1[i];
      const newEvent = m2[j];

      if (oldEvent.origin_server_ts <= newEvent.origin_server_ts) {
        if (!seen.has(oldEvent.event_id)) {
          seen.add(oldEvent.event_id);
          merged.push(oldEvent);
        }
        i += 1;
      } else {
        if (!seen.has(newEvent.event_id)) {
          seen.add(newEvent.event_id);
          merged.push(newEvent);
        }
        j += 1;
      }
    }

    // Drain remaining old events
    while (i < m1.length) {
      const event = m1[i];
      i += 1;

      if (!seen.has(event.event_id)) {
        seen.add(event.event_id);
        merged.push(event);
      }
    }

    // Drain remaining new events
    while (j < m2.length) {
      const event = m2[j];
      j += 1;

      if (!seen.has(event.event_id)) {
        seen.add(event.event_id);
        merged.push(event);
      }
    }

    return new Messages(merged);
  }
}
