import { useAtomValue } from 'jotai';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useOrphanRooms } from '../../../state/hooks/roomList';
import { useClient } from '../../../hooks/useClient';

export const useHomeRooms = () => {
  const ct = useClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const rooms = useOrphanRooms(ct, allRoomsAtom, mDirects, roomToParents);
  return rooms;
};
