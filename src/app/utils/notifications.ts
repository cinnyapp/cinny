import { MatrixClient, ReceiptType } from 'matrix-js-sdk';

export async function markAsRead(mx: MatrixClient, roomId: string, privateReceipt: boolean) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  const timeline = room.getLiveTimeline().getEvents();
  // `ignoreSynthesized = true`: matrix-js-sdk synthesizes an implicit read receipt
  // for the sender of every live event, so when our own message is the newest event
  // the default (non-ignoring) lookup returns that message as "read up to" and
  // `getLatestValidEvent()` bails out on its first iteration - no receipt is ever
  // sent and the server's notification count stays stuck. Only server-sent receipts
  // may decide whether there is anything left to acknowledge.
  const readEventId = room.getEventReadUpTo(mx.getUserId()!, true);

  const getLatestValidEvent = () => {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const latestEvent = timeline[i];
      if (latestEvent.getId() === readEventId) return null;
      if (!latestEvent.isSending()) return latestEvent;
    }
    return null;
  };
  if (timeline.length === 0) return;
  const latestEvent = getLatestValidEvent();
  if (latestEvent === null) return;

  await mx.sendReadReceipt(
    latestEvent,
    privateReceipt ? ReceiptType.ReadPrivate : ReceiptType.Read
  );
}
