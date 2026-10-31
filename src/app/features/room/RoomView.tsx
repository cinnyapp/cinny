import React, { MutableRefObject, useRef } from 'react';
import { Box, Text, config } from 'folds';
import { useEditor } from '../../components/editor';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { RoomTimeline } from './RoomTimeline';
import { RoomTombstone } from './RoomTombstone';
import { RoomInput } from './RoomInput';
import { RoomViewFollowing } from './RoomViewFollowing';
import { Page } from '../../components/page';
import { useSetting } from '../../state/hooks/settings';
import { useRoom } from '../../hooks/useRoom';
import { useObservableValue } from '../../hooks/useObservableValue';
import { useClient } from '../../hooks/useClient';
import { Timeline } from '../../../client/room';
import { useEditorAutoFocus } from './hooks/useEditorAutoFocus';
import { FollowingMembersPlaceholder } from './components';
import { useCanMessage } from './hooks/useCanMessage';

type RoomViewProps = {
  eventId?: string;
  threadFocusRef: MutableRefObject<boolean>;
  timeline: Timeline;
};
export function RoomView({ eventId, timeline, threadFocusRef }: RoomViewProps) {
  const roomInputRef = useRef<HTMLDivElement>(null);
  const roomViewRef = useRef<HTMLDivElement>(null);

  const [hideActivity] = useSetting('hideActivity');

  const roomId = useRoom();
  const editor = useEditor();
  const ct = useClient();

  const roomToReplacement = useObservableValue(ct.roomToReplacement);
  const replacementRoom = roomToReplacement.get(roomId);

  useEditorAutoFocus(editor, threadFocusRef, false);
  const canMessage = useCanMessage();

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
