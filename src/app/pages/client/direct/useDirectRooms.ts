import { useAtomValue } from 'jotai';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useDirects } from '../../../state/hooks/roomList';
import { useClient } from '../../../hooks/useClient';

export const useDirectRooms = () => {
  const ct = useClient();
  const mDirects = useAtomValue(mDirectAtom);
  const directs = useDirects(ct, allRoomsAtom, mDirects);
  return directs;
};
