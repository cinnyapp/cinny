import { ReactNode } from 'react';
import { RoomToParents } from '../../types/matrix/room';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { allRoomsAtom } from '../state/room-list/roomList';
import { useSpaceChildRooms } from '../state/hooks/roomList';

type SpaceChildRoomsProviderProps = {
  spaceId: string;
  roomToParents: RoomToParents;
  children: (rooms: string[]) => ReactNode;
};
export function SpaceChildRoomsProvider({
  spaceId,
  roomToParents,
  children,
}: SpaceChildRoomsProviderProps) {
  const mx = useMatrixClient();

  const childRooms = useSpaceChildRooms(mx, spaceId, allRoomsAtom, roomToParents);

  return children(childRooms);
}
