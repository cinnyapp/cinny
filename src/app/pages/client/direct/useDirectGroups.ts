import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useOrphanRooms } from '../../../state/hooks/roomList';

export const useDirectGroups = () => {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);

  return useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
};
