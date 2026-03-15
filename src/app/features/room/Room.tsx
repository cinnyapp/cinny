import React, { useCallback, useEffect } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useAtom, useAtomValue } from 'jotai';
import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ThreadBrowser } from './ThreadBrowser';
import { ThreadDrawer } from './ThreadDrawer';
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
import { RoomViewHeader } from './RoomViewHeader';
import { callChatAtom } from '../../state/callEmbed';
import { roomIdToOpenThreadAtomFamily } from '../../state/room/roomToOpenThread';
import { roomIdToThreadBrowserAtomFamily } from '../../state/room/roomToThreadBrowser';
import { CallChatView } from './CallChatView';

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
  const [openThreadId, setOpenThread] = useAtom(roomIdToOpenThreadAtomFamily(room.roomId));
  const [threadBrowserOpen, setThreadBrowserOpen] = useAtom(
    roomIdToThreadBrowserAtomFamily(room.roomId)
  );

  useEffect(() => {
    if (!eventId) return;

    const event = room.findEventById(eventId);
    const threadRootId = event?.threadRootId;
    if (!threadRootId) return;

    if (!room.getThread(threadRootId)) {
      const rootEvent = room.findEventById(threadRootId);
      if (rootEvent) {
        room.createThread(threadRootId, rootEvent, [], false);
      }
    }

    setOpenThread(threadRootId);
  }, [eventId, room, setOpenThread]);

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

  const callView = room.isCallRoom();

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <Box grow="Yes" style={{ position: 'relative' }}>
        {callView && (screenSize === ScreenSize.Desktop || !chat) && (
          <Box grow="Yes" direction="Column">
            <RoomViewHeader callView />
            <Box grow="Yes">
              <CallView />
            </Box>
          </Box>
        )}
        {!callView && (
          <Box grow="Yes" direction="Column">
            <RoomViewHeader />
            <Box grow="Yes">
              <RoomView eventId={eventId} />
            </Box>
          </Box>
        )}

        {callView && chat && (
          <>
            {screenSize === ScreenSize.Desktop && (
              <Line variant="Background" direction="Vertical" size="300" />
            )}
            <CallChatView />
          </>
        )}
        {!callView && screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <MembersDrawer key={room.roomId} room={room} members={members} />
          </>
        )}
        {screenSize === ScreenSize.Desktop && openThreadId && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <ThreadDrawer
              key={`thread-${room.roomId}-${openThreadId}`}
              room={room}
              threadRootId={openThreadId}
              onClose={() => setOpenThread(undefined)}
            />
          </>
        )}
        {screenSize === ScreenSize.Desktop && threadBrowserOpen && !openThreadId && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <ThreadBrowser
              key={`thread-browser-${room.roomId}`}
              room={room}
              onOpenThread={(threadId) => {
                setOpenThread(threadId);
                setThreadBrowserOpen(false);
              }}
              onClose={() => setThreadBrowserOpen(false)}
            />
          </>
        )}
        {screenSize !== ScreenSize.Desktop && openThreadId && (
          <ThreadDrawer
            key={`thread-${room.roomId}-${openThreadId}`}
            room={room}
            threadRootId={openThreadId}
            onClose={() => setOpenThread(undefined)}
            overlay
          />
        )}
        {screenSize !== ScreenSize.Desktop && threadBrowserOpen && !openThreadId && (
          <ThreadBrowser
            key={`thread-browser-${room.roomId}`}
            room={room}
            onOpenThread={(threadId) => {
              setOpenThread(threadId);
              setThreadBrowserOpen(false);
            }}
            onClose={() => setThreadBrowserOpen(false)}
            overlay
          />
        )}
      </Box>
    </PowerLevelsContextProvider>
  );
}
