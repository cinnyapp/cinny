import React, { useCallback, useEffect } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useAtomValue } from 'jotai';
import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useKeyDown } from '../../hooks/useKeyDown';
import { markAsRead } from '../../utils/notifications';
import { setMarkedUnreadState } from '../../utils/markedUnread';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { CallView } from '../call/CallView';
import { RoomViewHeader } from './RoomViewHeader';
import { callChatAtom } from '../../state/callEmbed';
import { CallChatView } from './CallChatView';
import { SafeBoundary } from '../../components/error-boundary/SafeBoundary';

export function Room() {
  const { eventId } = useParams();
  const room = useRoom();
  const mx = useMatrixClient();

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const screenSize = useScreenSizeContext();
  const powerLevels = usePowerLevels(room);
  const members = useRoomMembers(mx, room.roomId);
  const chat = useAtomValue(callChatAtom);

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

  // MSC2867: "Clients SHOULD reset the unread marker by setting `unread` to
  // `false` when opening a room to display its timeline." Keyed on the room id,
  // so it runs exactly once per room open — the same place Element Web clears
  // it (its `ViewRoom` dispatch handler). Marking the room you are *currently*
  // in as unread therefore sticks until you navigate away and come back, which
  // is what Element does too.
  useEffect(() => {
    setMarkedUnreadState(mx, room.roomId, false).catch(() => undefined);
  }, [mx, room.roomId]);

  const callView = room.isCallRoom();

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box grow="Yes">
        {callView && (screenSize === ScreenSize.Desktop || !chat) && (
          <Box grow="Yes" direction="Column">
            <SafeBoundary where="room header" resetKeys={[room.roomId]}>
              <RoomViewHeader callView />
            </SafeBoundary>
            <Box grow="Yes">
              <SafeBoundary where="call view" variant="panel" resetKeys={[room.roomId]}>
                <CallView />
              </SafeBoundary>
            </Box>
          </Box>
        )}
        {!callView && (
          <Box grow="Yes" direction="Column">
            <SafeBoundary where="room header" resetKeys={[room.roomId]}>
              <RoomViewHeader />
            </SafeBoundary>
            <Box grow="Yes">
              <SafeBoundary where="room view" variant="panel" resetKeys={[room.roomId]}>
                <RoomView eventId={eventId} />
              </SafeBoundary>
            </Box>
          </Box>
        )}

        {callView && chat && (
          <>
            {screenSize === ScreenSize.Desktop && (
              <Line variant="Background" direction="Vertical" size="300" />
            )}
            <SafeBoundary where="call chat" variant="panel" resetKeys={[room.roomId]}>
              <CallChatView />
            </SafeBoundary>
          </>
        )}
        {!callView && screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <SafeBoundary where="members drawer" variant="panel" resetKeys={[room.roomId]}>
              <MembersDrawer key={room.roomId} room={room} members={members} />
            </SafeBoundary>
          </>
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
