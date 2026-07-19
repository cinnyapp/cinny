import { ClientEventWithoutRoomId } from 'neurone/lib/api/types';
import { EncryptedEvent } from './EncryptedEvent';

/**
 * Indexes encrypted events by room, Megolm session, and event ID.
 *
 * This index is used to efficiently locate encrypted events that depend on a
 * particular Megolm session. When new room keys become available, all events
 * associated with the corresponding room and session can be retrieved and
 * retried for decryption without scanning every tracked event.
 *
 * Structure:
 *
 * room_id -> session_id -> event_id -> EncryptedEvent
 */
export class EncryptedEventIndex<T extends ClientEventWithoutRoomId> {
  private readonly rooms = new Map<string, Map<string, Map<string, EncryptedEvent<T>>>>();

  get(roomId: string, sessionId: string, eventId: string): EncryptedEvent<T> | undefined {
    return this.rooms.get(roomId)?.get(sessionId)?.get(eventId);
  }

  store(roomId: string, sessionId: string, encryptedEvent: EncryptedEvent<T>): void {
    let sessions = this.rooms.get(roomId);
    if (!sessions) {
      sessions = new Map();
      this.rooms.set(roomId, sessions);
    }

    let events = sessions.get(sessionId);
    if (!events) {
      events = new Map();
      sessions.set(sessionId, events);
    }

    events.set(encryptedEvent.eventId, encryptedEvent);
  }

  getEventsForSession(roomId: string, sessionId: string): EncryptedEvent<T>[] {
    const events = this.rooms.get(roomId)?.get(sessionId);

    if (!events) {
      return [];
    }

    return Array.from(events.values());
  }

  public remove(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}
