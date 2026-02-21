/* eslint-disable no-nested-ternary */
import React, { useCallback } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useKeyDown } from '../../hooks/useKeyDown';
import { markAsRead } from '../../utils/notifications';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { CallView } from '../call/CallView';
import { useCallState } from '../../pages/client/call/CallProvider';
import { RoomViewHeader } from './RoomViewHeader';

export function Room() {
  const { eventId } = useParams();
  const room = useRoom();
  const mx = useMatrixClient();

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const { isChatOpen } = useCallState();
  const screenSize = useScreenSizeContext();
  const powerLevels = usePowerLevels(room);
  const members = useRoomMembers(mx, room?.roomId);

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          markAsRead(mx, room.roomId, hideActivity);
        }
      },
      [mx, room.roomId, hideActivity]
    )
  );

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box
        grow="Yes"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {room.isCallRoom() && <RoomViewHeader />}
        <Box
          grow="Yes"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <CallView room={room} />
          {(!room.isCallRoom() || isChatOpen) && (
            <Box
              grow="Yes"
              style={{
                width: room.isCallRoom() ? (isChatOpen ? '40%' : '0%') : '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#fff' }}>
                <RoomView room={room} eventId={eventId} />
              </Box>
            </Box>
          )}
          {screenSize === ScreenSize.Desktop && !room.isCallRoom() && isDrawer && (
            <>
              <Line variant="Background" direction="Vertical" size="300" />
              <MembersDrawer key={room.roomId} room={room} members={members} />
            </>
          )}
        </Box>
      </Box>
    </PowerLevelsContextProvider>
  );
}
