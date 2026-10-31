import { MatrixClient } from 'matrix-js-sdk';
import { getRoomActivity } from '../state/room/roomActivity';

export type SortFunc<T> = (a: T, b: T) => number;

/**
 * Newest activity first, where activity = the last real MESSAGE (see
 * utils/roomActivity.ts) — not the last event of any kind, so a burst of
 * profile-picture / rename / member events does not lift a chat. Before the first
 * scan has run, falls back to the old "last event" timestamp.
 */
const activityKey = (mx: MatrixClient, roomId: string): number => {
  const activity = getRoomActivity(roomId);
  if (activity) return activity.known ? activity.ts : -1;
  return mx.getRoom(roomId)?.getLastActiveTimestamp() ?? Number.MIN_SAFE_INTEGER;
};

export const factoryRoomIdByActivity =
  (mx: MatrixClient): SortFunc<string> =>
  (a, b) =>
    activityKey(mx, b) - activityKey(mx, a);

export const factoryRoomIdByAtoZ =
  (mx: MatrixClient): SortFunc<string> =>
  (a, b) => {
    let aName = mx.getRoom(a)?.name ?? '';
    let bName = mx.getRoom(b)?.name ?? '';

    // remove "#" from the room name
    // To ignore it in sorting
    aName = aName.replace(/#/g, '');
    bName = bName.replace(/#/g, '');

    if (aName.toLowerCase() < bName.toLowerCase()) {
      return -1;
    }
    if (aName.toLowerCase() > bName.toLowerCase()) {
      return 1;
    }
    return 0;
  };

export const factoryRoomIdByUnreadCount =
  (getUnreadCount: (roomId: string) => number): SortFunc<string> =>
  (a, b) => {
    const aT = getUnreadCount(a) ?? 0;
    const bT = getUnreadCount(b) ?? 0;
    return bT - aT;
  };

export const byTsOldToNew: SortFunc<number> = (a, b) => a - b;

export const byOrderKey: SortFunc<string | undefined> = (a, b) => {
  if (!a && !b) {
    return 0;
  }

  if (!b) return -1;
  if (!a) return 1;

  if (a < b) {
    return -1;
  }
  return 1;
};
