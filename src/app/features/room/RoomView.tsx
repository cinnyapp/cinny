import React, { useCallback, useRef } from 'react';
import { Box, Text, config } from 'folds';
import { ReactEditor } from 'slate-react';
import { isKeyHotkey } from 'is-hotkey';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useEditor } from '../../components/editor';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { RoomTimeline } from './RoomTimeline';
import { RoomTombstone } from './RoomTombstone';
import { RoomInput } from './RoomInput';
import { RoomViewFollowing, RoomViewFollowingPlaceholder } from './RoomViewFollowing';
import { Page } from '../../components/page';
import { useKeyDown } from '../../hooks/useKeyDown';
import { editableActiveElement } from '../../utils/dom';
import { settingsAtom } from '../../state/settings';
import { useSetting } from '../../state/hooks/settings';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoom } from '../../hooks/useRoom';
import { useObservableValue } from '../../hooks/useObservableValue';
import { useClient } from '../../hooks/useClient';
import { MessageEvent } from '../../../types/matrix/room';
import { Timeline } from '../../../client/room';

const FN_KEYS_REGEX = /^F\d+$/;
const shouldFocusMessageField = (evt: KeyboardEvent): boolean => {
  const { code } = evt;
  if (evt.metaKey || evt.altKey || evt.ctrlKey) {
    return false;
  }

  if (FN_KEYS_REGEX.test(code)) return false;

  if (
    code.startsWith('OS') ||
    code.startsWith('Meta') ||
    code.startsWith('Shift') ||
    code.startsWith('Alt') ||
    code.startsWith('Control') ||
    code.startsWith('Arrow') ||
    code.startsWith('Page') ||
    code.startsWith('End') ||
    code.startsWith('Home') ||
    code === 'Tab' ||
    code === 'Space' ||
    code === 'Enter' ||
    code === 'NumLock' ||
    code === 'ScrollLock'
  ) {
    return false;
  }

  return true;
};

export function RoomView({ eventId, timeline }: { eventId?: string; timeline: Timeline }) {
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

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (editableActiveElement()) return;
        const portalContainer = document.getElementById('portalContainer');
        if (portalContainer && portalContainer.children.length > 0) {
          return;
        }
        if (shouldFocusMessageField(evt) || isKeyHotkey('mod+v', evt)) {
          ReactEditor.focus(editor);
        }
      },
      [editor]
    )
  );

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
        {hideActivity ? <RoomViewFollowingPlaceholder /> : <RoomViewFollowing />}
      </Box>
    </Page>
  );
}
