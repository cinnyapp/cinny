import { MatrixClient, Room } from 'matrix-js-sdk';

/**
 * "Mark as unread" — MSC2867, stable in the Matrix spec since **v1.12**
 * (Client-Server API § "Read and unread markers → Unread markers").
 *
 * The state lives in *room* account data (per room, per user) as
 * `m.marked_unread` with `{ "unread": true | false }`. An absent event means
 * "not marked unread".
 *
 * Interop note (checked against the current source of each client):
 *  - Element Web (`utils/notifications.ts`), Element X (matrix-rust-sdk
 *    `Room::set_unread_flag`) and FluffyChat (matrix-dart-sdk `Room.markUnread`)
 *    all **write the stable key only** and **read stable-then-unstable**.
 *  - We do the same. Writing the unstable key as well would strand a room as
 *    permanently unread in any client that reads only the unstable key, because
 *    modern clients clear the stable one.
 *  - We do clear a leftover unstable flag, which is the migration MSC2867 asks
 *    implementations that shipped the unstable prefix to perform.
 *
 * matrix-js-sdk 38.2.0 (pinned here) has no `EventType.MarkedUnread`, hence the
 * string constants.
 */

/** Stable room account data type, Matrix spec v1.12. */
export const MARKED_UNREAD_TYPE_STABLE = 'm.marked_unread';
/** Unstable prefix used by Famedly/FluffyChat before stabilisation (MSC2867). */
export const MARKED_UNREAD_TYPE_UNSTABLE = 'com.famedly.marked_unread';

export type MarkedUnreadContent = {
  unread?: boolean;
};

const readFlag = (room: Room, type: string): boolean | undefined => {
  const content = room.getAccountData(type)?.getContent<MarkedUnreadContent>();
  if (typeof content?.unread !== 'boolean') return undefined;
  return content.unread;
};

/**
 * The room's marked-unread state, reading the stable key first and falling back
 * to the unstable one — identical to Element Web's `getMarkedUnreadState` and
 * FluffyChat's `Room.markedUnread`.
 *
 * @returns `undefined` when neither key carries an explicit boolean. Callers
 * that only need a yes/no should treat that as `false` (the spec requires it).
 */
export const getMarkedUnreadState = (room: Room): boolean | undefined =>
  readFlag(room, MARKED_UNREAD_TYPE_STABLE) ?? readFlag(room, MARKED_UNREAD_TYPE_UNSTABLE);

/** `true` only when the room is explicitly marked unread. */
export const isRoomMarkedUnread = (room: Room): boolean => getMarkedUnreadState(room) === true;

/** `true` when the account data event belongs to the marked-unread feature. */
export const isMarkedUnreadType = (eventType: string): boolean =>
  eventType === MARKED_UNREAD_TYPE_STABLE || eventType === MARKED_UNREAD_TYPE_UNSTABLE;

/**
 * Set or clear the room's marked-unread flag.
 *
 * Writes the stable key only, and skips the request entirely when the value is
 * already what we want (a bulk "Mark as Read" over thousands of rooms must not
 * fire thousands of pointless PUTs). `m.fully_read` and read receipts are never
 * touched, so the user's read position survives — MSC2867 requires this.
 */
export const setMarkedUnreadState = async (
  mx: MatrixClient,
  roomId: string,
  unread: boolean
): Promise<void> => {
  const room = mx.getRoom(roomId);
  if (!room) return;

  const stable = readFlag(room, MARKED_UNREAD_TYPE_STABLE);
  const unstable = readFlag(room, MARKED_UNREAD_TYPE_UNSTABLE);
  const current = stable ?? unstable;

  if (Boolean(current) !== unread) {
    await mx.setRoomAccountData(roomId, MARKED_UNREAD_TYPE_STABLE, { unread });
  }

  // MSC2867 asks implementations to migrate users off the unstable prefix. A
  // stale `com.famedly.marked_unread: true` would otherwise keep the room
  // unread for clients that read the unstable key as a fallback (we do too).
  if (!unread && unstable === true) {
    await mx.setRoomAccountData(roomId, MARKED_UNREAD_TYPE_UNSTABLE, { unread: false });
  }
};
