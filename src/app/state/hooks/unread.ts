import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { RoomToUnread, Unread } from '../../../types/matrix/room';
import { roomToUnreadAtom, unreadEqual } from '../room/roomToUnread';

const compareUnreadEqual = (u1?: Unread, u2?: Unread): boolean => {
  if (!u1 || !u2) return false;
  return unreadEqual(u1, u2);
};

const getRoomsUnread = (rooms: string[], roomToUnread: RoomToUnread): Unread | undefined => {
  const unread = rooms.reduce<Unread | undefined>((u, roomId) => {
    const roomUnread = roomToUnread.get(roomId);
    if (!roomUnread) return u;
    const newUnread: Unread = u ?? {
      total: 0,
      highlight: 0,
      from: new Set(),
    };
    newUnread.total += roomUnread.total;
    newUnread.highlight += roomUnread.highlight;
    newUnread.from?.add(roomId);
    return newUnread;
  }, undefined);
  return unread;
};

export const useRoomsUnread = (
  rooms: string[],
  roomToUnreadAtm: typeof roomToUnreadAtom
): Unread | undefined => {
  const selector = useCallback(
    (roomToUnread: RoomToUnread) => getRoomsUnread(rooms, roomToUnread),
    [rooms]
  );
  return useAtomValue(selectAtom(roomToUnreadAtm, selector, compareUnreadEqual));
};

export const useRoomUnread = (
  roomId: string,
  roomToUnreadAtm: typeof roomToUnreadAtom
): Unread | undefined => {
  const selector = useCallback((roomToUnread: RoomToUnread) => roomToUnread.get(roomId), [roomId]);
  return useAtomValue(selectAtom(roomToUnreadAtm, selector, compareUnreadEqual));
};
