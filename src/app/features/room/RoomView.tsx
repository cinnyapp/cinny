import React, { MutableRefObject, useRef } from 'react';
import { Box, Text, config } from 'folds';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useEditor } from '../../components/editor';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { RoomTimeline } from './RoomTimeline';
import { RoomTombstone } from './RoomTombstone';
import { RoomInput } from './RoomInput';
import { RoomViewFollowing } from './RoomViewFollowing';
import { Page } from '../../components/page';
import { settingsAtom } from '../../state/settings';
import { useSetting } from '../../state/hooks/settings';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoom } from '../../hooks/useRoom';
import { useObservableValue } from '../../hooks/useObservableValue';
import { useClient } from '../../hooks/useClient';
import { MessageEvent } from '../../../types/matrix/room';
import { Timeline } from '../../../client/room';
import { useEditorAutoFocus } from './hooks/useEditorAutoFocus';
import { FollowingMembersPlaceholder } from './components';

type RoomViewProps = {
  eventId?: string;
  threadFocusRef: MutableRefObject<boolean>;
  timeline: Timeline;
};
export function RoomView({ eventId, timeline, threadFocusRef }: RoomViewProps) {
  const roomInputRef = useRef<HTMLDivElement>(null);
  const roomViewRef = useRef<HTMLDivElement>(null);

  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');

  const roomId = useRoom();
  const editor = useEditor();
  const ct = useClient();

  const roomToReplacement = useObservableValue(ct.roomToReplacement);
  const replacementRoom = roomToReplacement.get(roomId);

  const creators = useRoomCreators(roomId);
  const powerLevels = usePowerLevelsContext();

  const permissions = useRoomPermissions(creators, powerLevels);
  const canMessage = permissions.event(MessageEvent.RoomMessage, ct.session.userId);

  useEditorAutoFocus(editor, threadFocusRef, false);

  return (
    <Page ref={roomViewRef}>
      <Box grow="Yes" direction="Column">
        {timeline && (
          <RoomTimeline
            key={roomId}
            eventId={eventId}
            roomInputRef={roomInputRef}
            editor={editor}
            timeline={timeline}
          />
        )}
      </Box>
      <Box shrink="No" direction="Column">
        <div style={{ padding: `0 ${config.space.S400}` }}>
          {replacementRoom ? (
            <RoomTombstone roomId={roomId} replacementRoomId={replacementRoom} />
          ) : (
            <>
              {canMessage && (
                <RoomInput editor={editor} fileDropContainerRef={roomViewRef} ref={roomInputRef} />
              )}
              {!canMessage && (
                <RoomInputPlaceholder
                  style={{ padding: config.space.S200 }}
                  alignItems="Center"
                  justifyContent="Center"
                >
                  <Text align="Center">You do not have permission to post in this room</Text>
                </RoomInputPlaceholder>
              )}
            </>
          )}
        </div>
        {hideActivity ? <FollowingMembersPlaceholder /> : <RoomViewFollowing />}
      </Box>
    </Page>
  );
}
