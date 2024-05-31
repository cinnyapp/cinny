import { ReactNode } from 'react';
import { RoomToParents } from '../../types/matrix/room';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { allRoomsAtom } from '../state/room-list/roomList';
import { useChildRoomScopeFactory, useSpaceChildren } from '../state/hooks/roomList';

type SpaceChildRoomsProviderProps = {
  spaceId: string;
  mDirects: Set<string>;
  roomToParents: RoomToParents;
  children: (rooms: string[]) => ReactNode;
};
export function SpaceChildRoomsProvider({
  spaceId,
  roomToParents,
  mDirects,
  children,
}: SpaceChildRoomsProviderProps) {
  const mx = useMatrixClient();

  const childRooms = useSpaceChildren(
    allRoomsAtom,
    spaceId,
    useChildRoomScopeFactory(mx, mDirects, roomToParents)
  );

  return children(childRooms);
}
