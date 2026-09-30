import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useOrphanRooms } from '../../../state/hooks/roomList';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';

/**
 * The room list behind Home — the sidebar Home badge, the Home panel and the
 * Home route all read it, so every one of them agrees on what "Home" contains.
 */
export const useHomeRooms = () => {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const [showAllRooms] = useSetting(settingsAtom, 'homeShowsAllRooms');
  const rooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents, showAllRooms);
  return rooms;
};
