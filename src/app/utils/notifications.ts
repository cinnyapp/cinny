import { MatrixClient, ReceiptType } from 'matrix-js-sdk';
import { RoomAccountDataEvent } from '../../types/matrix/accountData';

/**
 * Clears a room's unread marker. This is distinct from marking an event in a room as unread.
 * @param mx An instance of the Matrix client.
 * @param roomId The ID of the room to clear the unread marker for.
 * @returns A promise that completes when the room's unread marker is cleared.
 * @see https://spec.matrix.org/v1.17/client-server-api/#unread-markers
 */
export async function clearUnreadMarker(mx: MatrixClient, roomId: string) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  await mx.setRoomAccountData(room.roomId, RoomAccountDataEvent.MarkedUnread, {
    unread: false,
  });
}

export async function markAsRead(mx: MatrixClient, roomId: string, privateReceipt: boolean) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  const timeline = room.getLiveTimeline().getEvents();
  const readEventId = room.getEventReadUpTo(mx.getUserId()!);

  const getLatestValidEvent = () => {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const latestEvent = timeline[i];
      if (latestEvent.getId() === readEventId) return null;
      if (!latestEvent.isSending()) return latestEvent;
    }
    return null;
  };

  await clearUnreadMarker(mx, roomId);

  if (timeline.length === 0) return;
  const latestEvent = getLatestValidEvent();
  if (latestEvent === null) return;

  await mx.sendReadReceipt(
    latestEvent,
    privateReceipt ? ReceiptType.ReadPrivate : ReceiptType.Read
  );
}

/**
 * Marks the room as unread.
 * @param mx An instance of the Matrix client.
 * @param roomId The ID of the room to mark as unread.
 * @returns A promise that completes when the room is marked as unread.
 * @see https://spec.matrix.org/v1.17/client-server-api/#unread-markers
 */
export async function markAsUnread(mx: MatrixClient, roomId: string) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  await mx.setRoomAccountData(room.roomId, RoomAccountDataEvent.MarkedUnread, {
    unread: true,
  });
}
