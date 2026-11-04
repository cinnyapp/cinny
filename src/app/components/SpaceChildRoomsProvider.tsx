/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
