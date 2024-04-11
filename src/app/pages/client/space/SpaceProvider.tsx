import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useSpaces } from '../../../state/hooks/roomList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useSelectedSpace } from '../../../hooks/router/useSelectedSpace';
import { SpaceProvider } from '../../../hooks/useSpace';
import { JoinBeforeNavigate } from '../../../features/join-before-navigate';

export function RouteSpaceProvider() {
  const mx = useMatrixClient();
  const joinedSpaces = useSpaces(mx, allRoomsAtom);
  const { spaceIdOrAlias } = useParams();

  const selectedSpaceId = useSelectedSpace();
  const space = mx.getRoom(selectedSpaceId);

  if (!space || !joinedSpaces.includes(space.roomId)) {
    return <JoinBeforeNavigate roomIdOrAlias={spaceIdOrAlias ?? ''} />;
  }

  return (
    <SpaceProvider key={space.roomId} value={space}>
      <Outlet />
    </SpaceProvider>
  );
}
