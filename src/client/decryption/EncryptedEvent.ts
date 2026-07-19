import {
  ClientEventWithoutRoomId,
  MessageEventWithoutRoomId,
  StateEventWithoutRoomId,
} from 'neurone/lib/api/types';
import { MegolmDecryptionError, RoomEncryption } from 'neurone/lib/crypto/machine';
import { ObservableValue } from 'neurone/lib/utils/observable';

export class EventDecryptionIdle {}

export class EventDecryptionPending {}

export class EventDecryptionError {
  public readonly error?: MegolmDecryptionError;

  public readonly cause?: unknown;

  constructor(error?: MegolmDecryptionError, cause?: unknown) {
    this.error = error;
    this.cause = cause;
  }
}

export class EventDecryptionSuccess<T extends ClientEventWithoutRoomId> {
  public readonly event: T extends StateEventWithoutRoomId
    ? StateEventWithoutRoomId
    : MessageEventWithoutRoomId;

  constructor(
    event: T extends StateEventWithoutRoomId ? StateEventWithoutRoomId : MessageEventWithoutRoomId
  ) {
    this.event = event;
  }
}

export class EncryptedEvent<T extends ClientEventWithoutRoomId> {
  private readonly roomEncryption: RoomEncryption;

  private readonly publishKey = crypto.randomUUID();

  private decryptPromise: Promise<void> | undefined;

  public readonly roomId: string;

  public readonly event: T;

  public readonly decryption: ObservableValue<
    EventDecryptionPending | EventDecryptionError | EventDecryptionSuccess<T>
  >;

  constructor(roomEncryption: RoomEncryption, roomId: string, event: T) {
    this.roomEncryption = roomEncryption;

    this.roomId = roomId;
    this.event = event;

    this.decryption = new ObservableValue(new EventDecryptionIdle(), this.publishKey);
  }

  get eventId(): string {
    return this.event.event_id;
  }

  public decrypt(): Promise<void> {
    if (this.decryptPromise) {
      return this.decryptPromise;
    }

    this.decryptPromise = this.runDecryption().finally(() => {
      this.decryptPromise = undefined;
    });

    return this.decryptPromise;
  }

  private async runDecryption(): Promise<void> {
    this.decryption.publish(this.publishKey, new EventDecryptionPending());

    try {
      const [err, decryptedEvent] = await this.roomEncryption.decryptEvent<T>(
        this.roomId,
        this.event
      );

      this.decryption.publish(
        this.publishKey,
        err ? new EventDecryptionError(err) : new EventDecryptionSuccess<T>(decryptedEvent)
      );
    } catch (e) {
      this.decryption.publish(this.publishKey, new EventDecryptionError(undefined, e));
    }
  }
}
