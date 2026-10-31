import { MatrixClient, ReceiptType } from 'matrix-js-sdk';
import { setMarkedUnreadState } from './markedUnread';

/**
 * Send a read receipt for the room's newest event.
 *
 * @param clearMarkedUnread also clear the MSC2867 `m.marked_unread` flag. The
 * spec says a client that offers "mark as read" SHOULD reset the unread marker
 * at the same time, so this defaults to `true` and every explicit/bulk
 * "Mark as Read" entry point gets it. The *automatic* receipts sent while the
 * user sits at the live end of a timeline pass `false`: otherwise marking the
 * room you are currently looking at as unread would be undone instantly. (The
 * spec's other clearing rule — "when opening a room to display its timeline" —
 * is handled once per room open in `features/room/Room.tsx`, mirroring Element
 * Web's `ViewRoom` handler.)
 */
export async function markAsRead(
  mx: MatrixClient,
  roomId: string,
  privateReceipt: boolean,
  clearMarkedUnread = true
) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  if (clearMarkedUnread) {
    // Deliberately not awaited: clearing the flag must not delay (or be able to
    // fail) the read receipt below. `setMarkedUnreadState` is a no-op when the
    // room is not marked, so the bulk "Mark as Read" paths stay free.
    setMarkedUnreadState(mx, roomId, false).catch(() => undefined);
  }

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
