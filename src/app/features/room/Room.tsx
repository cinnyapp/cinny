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
import { useRoom } from '../../hooks/useRoom';

export function Room() {
  const mx = useMatrixClient();
  const { eventId } = useParams();
  const room = useRoom();
  useBindRoomIdToTypingMembersAtom(mx, roomIdToTypingMembersAtom);

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const screenSize = useScreenSize();
  const powerLevels = usePowerLevels(room);

  return (
    <PowerLevelsContextProvider value={powerLevels}>
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
