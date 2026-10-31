import React, { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { IsDirectRoomProvider, RoomProvider } from '../../../hooks/useRoom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { JoinBeforeNavigate } from '../../../features/join-before-navigate';
import { useReplayProgress } from '../../../hooks/useReplayProgress';
import { RoomCatchingUp } from '../../../components/RoomCatchingUp';
import { useDirectRooms } from './useDirectRooms';

export function DirectRouteRoomProvider({ children }: { children: ReactNode }) {
  const mx = useMatrixClient();
  const rooms = useDirectRooms();

  const { roomIdOrAlias, eventId } = useParams();
  const roomId = useSelectedRoom();
  const room = mx.getRoom(roomId);

  // Staged start-up: while the older chats are still being rebuilt, a chat that
  // has not landed yet is "catching up", never a "join this room" screen.
  const replay = useReplayProgress(mx);
  const membersList = rooms;
  if ((!room || !membersList.includes(room.roomId)) && replay.active) {
    return <RoomCatchingUp done={replay.done} total={replay.total} />;
  }

  if (!room || !rooms.includes(room.roomId)) {
    return <JoinBeforeNavigate roomIdOrAlias={roomIdOrAlias!} eventId={eventId} />;
  }

  return (
    <RoomProvider key={room.roomId} value={room}>
      <IsDirectRoomProvider value>{children}</IsDirectRoomProvider>
    </RoomProvider>
  );
}
