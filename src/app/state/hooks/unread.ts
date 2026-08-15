import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { unreadRoomsAtom } from '../room/roomToUnread';

export const useRoomsUnread = (
  rooms: string[],
  unreadRooms: typeof unreadRoomsAtom
): Set<string> => {
  const selector = useCallback(
    (unreads: Set<string>) => new Set<string>(rooms.filter((roomId) => unreads.has(roomId))),
    [rooms]
  );

  return useAtomValue(selectAtom(unreadRooms, selector));
};

export const useRoomUnread = (roomId: string, unreadRooms: typeof unreadRoomsAtom): boolean => {
  const selector = useCallback((unreads: Set<string>) => unreads.has(roomId), [roomId]);

  return useAtomValue(selectAtom(unreadRooms, selector));
};
