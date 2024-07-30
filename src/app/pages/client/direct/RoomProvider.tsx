import React, { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { RoomProvider } from '../../../hooks/useRoom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { JoinBeforeNavigate } from '../../../features/join-before-navigate';
import { useDirectRooms } from './useDirectRooms';

export function DirectRouteRoomProvider({ children }: { children: ReactNode }) {
  const mx = useMatrixClient();
  const rooms = useDirectRooms();

  const { roomIdOrAlias, eventId } = useParams();
  const roomId = useSelectedRoom();
  const room = mx.getRoom(roomId);

  if (!room || !rooms.includes(room.roomId)) {
    return <JoinBeforeNavigate roomIdOrAlias={roomIdOrAlias!} eventId={eventId} />;
  }

  return (
    <RoomProvider key={room.roomId} value={room}>
      {children}
    </RoomProvider>
  );
}
