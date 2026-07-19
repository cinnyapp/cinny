import {
  ClientEventWithoutRoomId,
  MessageEventWithoutRoomId,
  StateEventWithoutRoomId,
} from 'neurone/lib/api/types';
import { Machine, RoomKeyInfo, RoomKeyWithheldInfo } from 'neurone/lib/crypto/machine';
import { ObjectReader } from 'neurone/lib/utils';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { EncryptedEvent } from './EncryptedEvent';
import { EncryptedEventIndex } from './EncryptedEventIndex';

export class DecryptionManager implements Disposable {
  private readonly machine: Machine;

  private readonly disposer = new Disposer();

  private readonly stateEvents = new EncryptedEventIndex<StateEventWithoutRoomId>();

  private readonly messageEvents = new EncryptedEventIndex<MessageEventWithoutRoomId>();

  constructor(machine: Machine) {
    this.machine = machine;

    this.disposer.collect(
      this.machine.events.onRoomKeysUpdated.subscribe(this.handleRoomKeysUpdated.bind(this)),
      this.machine.events.onRoomKeysWithheld.subscribe(this.handleRoomKeysWithheld.bind(this))
    );
  }

  private handleRoomKeysUpdated(keysInfo: RoomKeyInfo[]): void {
    keysInfo.forEach((keyInfo) => this.decryptSession(keyInfo.roomId, keyInfo.sessionId));
  }

  private handleRoomKeysWithheld(keysInfo: RoomKeyWithheldInfo[]): void {
    keysInfo.forEach((keyInfo) => this.decryptSession(keyInfo.roomId, keyInfo.sessionId));
  }

  private decryptSession(roomId: string, sessionId: string): void {
    const m = this.messageEvents.getEventsForSession(roomId, sessionId);
    m.forEach((event) => event.decrypt());

    const s = this.stateEvents.getEventsForSession(roomId, sessionId);
    s.forEach((event) => event.decrypt());
  }

  private registerEvent<T extends ClientEventWithoutRoomId>(
    eventIndex: EncryptedEventIndex<T>,
    roomId: string,
    event: T
  ): EncryptedEvent<T> {
    const { content } = event;
    const sessionId = ObjectReader.string(content, 'session_id');

    if (!sessionId) {
      throw new Error('Malformed event! Missing session_id');
    }

    const existingEvent = eventIndex.get(roomId, sessionId, event.event_id);
    if (existingEvent) return existingEvent;

    const encryptedEvent = new EncryptedEvent(this.machine.roomEncryption, roomId, event);

    eventIndex.store(roomId, sessionId, encryptedEvent);

    return encryptedEvent;
  }

  public decryptableMessageEvent(
    roomId: string,
    event: MessageEventWithoutRoomId
  ): EncryptedEvent<MessageEventWithoutRoomId> {
    return this.registerEvent(this.messageEvents, roomId, event);
  }

  public decryptableStateEvent(
    roomId: string,
    event: StateEventWithoutRoomId
  ): EncryptedEvent<StateEventWithoutRoomId> {
    return this.registerEvent(this.stateEvents, roomId, event);
  }

  dispose(): void {
    this.disposer.run();
  }
}
