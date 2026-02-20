import {
  EventType,
  IContent,
  MatrixClient,
  MatrixEvent,
  Room,
  UpdateDelayedEventAction,
} from 'matrix-js-sdk';
import type {
  DelayedEventInfo,
  SendDelayedEventResponse,
} from 'matrix-js-sdk/lib/@types/requests';

// Grab types needed for encryption
interface EncryptableBackend {
  encryptEvent(event: MatrixEvent, room: Room): Promise<void>;
}

export async function supportsDelayedEvents(mx: MatrixClient): Promise<boolean> {
  try {
    return await mx.doesServerSupportUnstableFeature('org.matrix.msc4140');
  } catch {
    return false;
  }
}

export async function sendDelayedMessage(
  mx: MatrixClient,
  roomId: string,
  content: IContent,
  delayMs: number,
  threadId?: string | null
): Promise<SendDelayedEventResponse> {
  return mx._unstable_sendDelayedEvent(
    roomId,
    { delay: delayMs },
    threadId ?? null,
    EventType.RoomMessage,
    content as any // eslint-disable-line @typescript-eslint/no-explicit-any
  );
}

/**
 * Send a delayed message in an E2EE room by pre-encrypting the content at
 * scheduling time. The message is encrypted with the current Megolm session
 * Devices that join or add new device keys after this call will not be
 * able to decrypt it
 */
export async function sendDelayedMessageE2EE(
  mx: MatrixClient,
  roomId: string,
  room: Room,
  content: IContent,
  delayMs: number,
  threadId?: string | null
): Promise<SendDelayedEventResponse> {
  const crypto = mx.getCrypto();
  if (!crypto || !('encryptEvent' in crypto)) {
    throw new Error('Encryption not available: no crypto backend with encryptEvent');
  }

  // Create a temporary MatrixEvent to encrypt in-place.
  const event = new MatrixEvent({
    type: EventType.RoomMessage,
    content,
    room_id: roomId,
    sender: mx.getUserId() ?? '',
    event_id: `~${roomId}:${Date.now()}`,
    origin_server_ts: Date.now(),
    unsigned: {},
  });

  // Minimal interface to CryptoAPI
  await (crypto as unknown as EncryptableBackend).encryptEvent(event, room);

  // After encryption:
  //   event.getWireType()    === 'm.room.encrypted'
  //   event.getWireContent() === the Megolm ciphertext object
  // Pass the pre-encrypted payload directly to the delayed-events API.
  // We cast to any because EventType.RoomMessageEncrypted is not part of the
  // TimelineEvents mapped type used by _unstable_sendDelayedEvent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mx as any)._unstable_sendDelayedEvent(
    roomId,
    { delay: delayMs },
    threadId ?? null,
    event.getWireType(),
    event.getWireContent()
  );
}

export async function getDelayedEvents(
  mx: MatrixClient
): Promise<DelayedEventInfo> {
  return mx._unstable_getDelayedEvents();
}

export async function cancelDelayedEvent(
  mx: MatrixClient,
  delayId: string
): Promise<void> {
  await mx._unstable_updateDelayedEvent(delayId, UpdateDelayedEventAction.Cancel);
}

export async function sendDelayedEventNow(
  mx: MatrixClient,
  delayId: string
): Promise<void> {
  await mx._unstable_updateDelayedEvent(delayId, UpdateDelayedEventAction.Send);
}

export function computeDelayMs(targetDate: Date): number {
  const delay = targetDate.getTime() - Date.now();
  if (delay <= 0) throw new Error('Scheduled time must be in the future');
  return delay;
}
