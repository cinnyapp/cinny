import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { unreadRoomsAtom } from '../room/roomToUnread';
import { useClient } from '../../hooks/useClient';

const compareUnread = (u1: Set<string>, u2: Set<string>): boolean => {
  if (u1.size !== u2.size) {
    return false;
  }

  return [...u1].every((value) => u2.has(value));
};

export const useRoomsUnread = (
  rooms: string[],
  unreadRooms: typeof unreadRoomsAtom
): Set<string> => {
  const ct = useClient();

  const selector = useCallback(
    (unread: Set<string>) =>
      new Set<string>(
        rooms.filter((roomId) => unread.has(roomId) && !ct.spaceRooms.read.has(roomId))
      ),
    [rooms, ct]
  );

  return useAtomValue(selectAtom(unreadRooms, selector, compareUnread));
};

export const useRoomUnread = (roomId: string, unreadRooms: typeof unreadRoomsAtom): boolean => {
  const selector = useCallback((unread: Set<string>) => unread.has(roomId), [roomId]);

  return useAtomValue(selectAtom(unreadRooms, selector));
};
