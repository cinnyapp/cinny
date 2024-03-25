import { MatrixClient } from 'matrix-js-sdk';

export type SortFunc<T> = (a: T, b: T) => number;

export const factoryRoomIdByActivity =
  (mx: MatrixClient): SortFunc<string> =>
  (a, b) => {
    const room1 = mx.getRoom(a);
    const room2 = mx.getRoom(b);

    return (room2?.getLastActiveTimestamp() ?? 0) - (room1?.getLastActiveTimestamp() ?? 0);
  };

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
