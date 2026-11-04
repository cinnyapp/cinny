/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { IsDirectRoomProvider, RoomProvider } from '../../../hooks/useRoom';
import { JoinBeforeNavigate } from '../../../features/join-before-navigate';
import { useDirectRooms } from './useDirectRooms';

export function DirectRouteRoomProvider({ children }: { children: ReactNode }) {
  const rooms = useDirectRooms();

  const { roomIdOrAlias, eventId } = useParams();
  const roomId = useSelectedRoom();

  if (!roomId || !rooms.includes(roomId)) {
    return <JoinBeforeNavigate roomIdOrAlias={roomIdOrAlias!} eventId={eventId} />;
  }

  return (
    <RoomProvider key={roomId} value={roomId}>
      <IsDirectRoomProvider value>{children}</IsDirectRoomProvider>
    </RoomProvider>
  );
}
