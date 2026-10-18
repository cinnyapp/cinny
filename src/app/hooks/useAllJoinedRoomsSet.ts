import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { allRoomsAtom } from '../state/room-list/roomList';

export const useAllJoinedRoomsSet = () => {
  const allRooms = useAtomValue(allRoomsAtom);
  const allJoinedRooms = useMemo(() => new Set(allRooms), [allRooms]);

  return allJoinedRooms;
};
