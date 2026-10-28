import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { ClientContext } from '../../client/context';

export type SortFunc<T> = (a: T, b: T) => number;

export const activityTsScope = (
  ct: ClientContext,
  roomToLatestEvent: Map<string, MessageEventWithoutRoomId>
) => {
  const getTs = (rId: string) =>
    roomToLatestEvent.get(rId)?.origin_server_ts ??
    ct.state.join.create.read.find((ev) => ev.roomId === rId)?.event.origin_server_ts;

  return getTs;
};

export const factoryRoomIdByActivity =
  (getLatestEventTs: (roomId: string) => number | undefined): SortFunc<string> =>
  (a, b) =>
    (getLatestEventTs(b) ?? Number.MIN_SAFE_INTEGER) -
    (getLatestEventTs(a) ?? Number.MIN_SAFE_INTEGER);

export const factoryRoomIdByAtoZ =
  (getRoomName: (roomId: string) => string | undefined): SortFunc<string> =>
  (a, b) => {
    let aName = getRoomName(a) ?? '';
    let bName = getRoomName(b) ?? '';

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
