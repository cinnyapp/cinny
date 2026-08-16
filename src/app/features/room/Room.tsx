import React, { useCallback, useRef } from 'react';
import { Box, Line } from 'folds';
import { useParams } from 'react-router-dom';
import { isKeyHotkey } from 'is-hotkey';
import { RoomView } from './RoomView';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
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

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
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
          // markAsRead(mx, roomId, hideActivity);
        }
      },
      [roomId, hideActivity]
    )
  );

  return (
    <RoomMembersAPIProvider value={membersAPI}>
      <PowerLevelsContextProvider value={powerLevels}>
        <PowerLevelTagsContextProvider value={powerLevelTags}>
          {timeline && (
            <Box grow="Yes">
              <TimelineViewProvider value={timeline}>
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
              </TimelineViewProvider>

              {threadTimeline ? (
                <TimelineViewProvider value={threadTimeline}>
                  <Line variant="Surface" direction="Vertical" size="300" />
                  <ThreadView
                    threadTimeline={threadTimeline}
                    threadFocusRef={threadFocusRef}
                    requestClose={() => timeline.closeThread()}
                  />
                </TimelineViewProvider>
              ) : (
                screenSize === ScreenSize.Desktop &&
                isDrawer && (
                  <>
                    <Line variant="Background" direction="Vertical" size="300" />
                    <MembersDrawer key={roomId} />
                  </>
                )
              )}
            </Box>
          )}
        </PowerLevelTagsContextProvider>
      </PowerLevelsContextProvider>
    </RoomMembersAPIProvider>
  );
}
