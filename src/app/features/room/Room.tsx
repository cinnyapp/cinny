import React, { useCallback, useRef } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { useAtomValue } from 'jotai';
import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import {
  PowerLevelsContextProvider,
  usePowerLevels,
  usePowerLevelsState,
} from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useKeyDown } from '../../hooks/useKeyDown';
import { RoomMembersAPIProvider, useCreateRoomMembersAPI } from '../../hooks/useRoomMembers';
import {
  PowerLevelTagsContextProvider,
  usePowerLevelTags,
  usePowerLevelTagsState,
} from '../../hooks/usePowerLevelTags';
import { usePendingMemberLoader, usePendingMembers } from '../../hooks/usePendingMembers';
import { useObservableValue, useObservableValueOptionally } from '../../hooks/useObservableValue';
import { useClient } from '../../hooks/useClient';
import { ThreadView } from './thread-view';
import { TimelineViewProvider } from './hooks/useTimeline';
import { RoomViewHeader } from './RoomViewHeader';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { useCallEmbed } from '../../hooks/useCallEmbed';
import { callChatAtom } from '../../state/callEmbed';
import { isCallRoom } from '../../utils/room';
import { CallChatView } from './CallChatView';
import { CallView } from '../call/CallView';

export function Room() {
  const { eventId } = useParams();
  const ct = useClient();
  const roomId = useRoom();
  const roomToTimeline = useObservableValue(ct.roomToTimeline);

  const timeline = roomToTimeline.get(roomId);
  const activeThreadId = useObservableValueOptionally(timeline?.activeThread);
  const threads = useObservableValueOptionally(timeline?.threads);
  const threadTimeline = activeThreadId ? threads?.get(activeThreadId) : undefined;
  const threadFocusRef = useRef<boolean>(false);

  const callSession = useCallSession(roomId);
  const callMembers = useCallMembers(callSession);
  const callEmbed = useCallEmbed();
  const chat = useAtomValue(callChatAtom);

  const [isDrawer] = useSetting('isPeopleDrawer');
  const [hideActivity] = useSetting('hideActivity');
  const screenSize = useScreenSizeContext();
  const powerLevelStateResult = usePowerLevelsState(roomId);
  const powerLevels = usePowerLevels(powerLevelStateResult.value);
  const powerLevelTagsStateResult = usePowerLevelTagsState(roomId);
  const powerLevelTags = usePowerLevelTags(powerLevels, powerLevelTagsStateResult.value);
  const membersAPI = useCreateRoomMembersAPI(roomId);
  const membersPending = usePendingMembers(roomId);
  usePendingMemberLoader(roomId, membersPending);

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          // TODO: check overlay's
          if (activeThreadId && threadFocusRef.current) {
            timeline?.closeThread();
          }
          // markAsRead(mx, roomId, hideActivity);
        }
      },
      [activeThreadId, timeline]
    )
  );

  const callView =
    callEmbed?.roomId === roomId ||
    isCallRoom(ct.roomToType.read.get(roomId)) ||
    callMembers.length > 0;

  return (
    <RoomMembersAPIProvider value={membersAPI}>
      <PowerLevelsContextProvider value={powerLevels}>
        <PowerLevelTagsContextProvider value={powerLevelTags}>
          {timeline && (
            <Box grow="Yes">
              <TimelineViewProvider value={timeline}>
                {callView && (screenSize === ScreenSize.Desktop || !chat) && (
                  <Box grow="Yes" direction="Column">
                    <RoomViewHeader callView />
                    <Box grow="Yes">
                      <CallView />
                    </Box>
                  </Box>
                )}
                {!callView && !(threadTimeline && screenSize !== ScreenSize.Desktop) && (
                  <Box grow="Yes" direction="Column">
                    <RoomViewHeader />
                    <Box grow="Yes">
                      <RoomView
                        key={roomId}
                        threadFocusRef={threadFocusRef}
                        timeline={timeline}
                        eventId={eventId}
                      />
                    </Box>
                  </Box>
                )}
              </TimelineViewProvider>

              {callView && chat && !threadTimeline && (
                <TimelineViewProvider value={timeline}>
                  {screenSize === ScreenSize.Desktop && (
                    <Line variant="Background" direction="Vertical" size="300" />
                  )}
                  <CallChatView>
                    <RoomView
                      key={roomId}
                      threadFocusRef={threadFocusRef}
                      timeline={timeline}
                      eventId={eventId}
                    />
                  </CallChatView>
                </TimelineViewProvider>
              )}

              {threadTimeline && (
                <TimelineViewProvider key={threadTimeline.threadId} value={threadTimeline}>
                  {screenSize === ScreenSize.Desktop && (
                    <Line variant="Background" direction="Vertical" size="300" />
                  )}
                  <ThreadView
                    threadTimeline={threadTimeline}
                    threadFocusRef={threadFocusRef}
                    requestClose={() => timeline.closeThread()}
                  />
                </TimelineViewProvider>
              )}
              {!threadTimeline && !callView && screenSize === ScreenSize.Desktop && isDrawer && (
                <>
                  <Line variant="Background" direction="Vertical" size="300" />
                  <MembersDrawer key={roomId} />
                </>
              )}
            </Box>
          )}
        </PowerLevelTagsContextProvider>
      </PowerLevelsContextProvider>
    </RoomMembersAPIProvider>
  );
}
