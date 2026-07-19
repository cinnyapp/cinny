import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { getAllParents } from '../utils/room';
import { useAllJoinedRoomsSet } from './useGetRoom';
import { roomToParentsAtom } from '../state/room/roomToParents';

export const useImagePackRooms = (roomId: string): string[] => {
  const roomToParents = useAtomValue(roomToParentsAtom);
  const allJoinedRooms = useAllJoinedRoomsSet();

  const imagePackRooms: string[] = useMemo(() => {
    const allParentSpaces = [roomId].concat(Array.from(getAllParents(roomToParents, roomId)));
    return allParentSpaces.reduce<string[]>((list, rId) => {
      if (allJoinedRooms.has(rId)) list.push(rId);
      return list;
    }, []);
  }, [roomId, roomToParents, allJoinedRooms]);

  return imagePackRooms;
};
