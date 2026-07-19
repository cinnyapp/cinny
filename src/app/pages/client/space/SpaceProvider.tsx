import React, { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useSpaces } from '../../../state/hooks/roomList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useSelectedSpace } from '../../../hooks/router/useSelectedSpace';
import { SpaceProvider } from '../../../hooks/useSpace';
import { JoinBeforeNavigate } from '../../../features/join-before-navigate';
import { useSearchParamsViaServers } from '../../../hooks/router/useSearchParamsViaServers';
import { useClient } from '../../../hooks/useClient';

type RouteSpaceProviderProps = {
  children: ReactNode;
};
export function RouteSpaceProvider({ children }: RouteSpaceProviderProps) {
  const ct = useClient();
  const joinedSpaces = useSpaces(ct, allRoomsAtom);
  const selectedSpaceId = useSelectedSpace();

  const { spaceIdOrAlias } = useParams();
  const viaServers = useSearchParamsViaServers();

  if (!selectedSpaceId || !joinedSpaces.includes(selectedSpaceId)) {
    return <JoinBeforeNavigate roomIdOrAlias={spaceIdOrAlias ?? ''} viaServers={viaServers} />;
  }

  return (
    <SpaceProvider key={selectedSpaceId} value={selectedSpaceId}>
      {children}
    </SpaceProvider>
  );
}
