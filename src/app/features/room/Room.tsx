import React from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';

import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import {
  roomIdToTypingMembersAtom,
  useBindRoomIdToTypingMembersAtom,
} from '../../state/typingMembers';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { JoinBeforeNavigate } from '../join-before-navigate';
import { RoomProvider, useRoom } from '../../hooks/useRoom';

export type RoomBaseViewProps = {
  eventId?: string;
};
export function RoomBaseView({ eventId }: RoomBaseViewProps) {
  const mx = useMatrixClient();
  const room = useRoom();
  useBindRoomIdToTypingMembersAtom(mx, roomIdToTypingMembersAtom);

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const screenSize = useScreenSize();
  const powerLevelAPI = usePowerLevels(room);

  return (
    <PowerLevelsContextProvider value={powerLevelAPI}>
      <Box grow="Yes">
        <RoomView room={room} eventId={eventId} />
        {screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <MembersDrawer key={room.roomId} room={room} />
          </>
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}

export function RoomViewer() {
  const mx = useMatrixClient();
  const { roomIdOrAlias } = useParams();
  const roomId = useSelectedRoom();
  const room = mx.getRoom(roomId);
  const { eventId } = useParams();

  if (!room || !roomId) return <JoinBeforeNavigate roomIdOrAlias={roomIdOrAlias!} />;

  return (
    <RoomProvider value={room}>
      <RoomBaseView key={roomId} eventId={eventId} />
    </RoomProvider>
  );
}
