import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { unreadRoomsAtom } from '../room/roomToUnread';
import { useClient } from '../../hooks/useClient';

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

  return useAtomValue(selectAtom(unreadRooms, selector));
};

export const useRoomUnread = (roomId: string, unreadRooms: typeof unreadRoomsAtom): boolean => {
  const selector = useCallback((unread: Set<string>) => unread.has(roomId), [roomId]);

  return useAtomValue(selectAtom(unreadRooms, selector));
};
