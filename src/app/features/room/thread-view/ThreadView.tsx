import React, { MutableRefObject, useRef } from 'react';
import { Box, config, Icon, IconButton, Icons, Text, Tooltip, TooltipProvider, toRem } from 'folds';
import { ThreadTimeline } from '../../../../client/room/ThreadTimeline';
import { Page, PageHeader } from '../../../components/page';
import { useEditor } from '../../../components/editor';
import { RoomInput } from '../RoomInput';
import { TimelineView } from './TimelineView';
import { useEditorAutoFocus, useThreadFocus } from '../hooks/useEditorAutoFocus';
import { useSetting } from '../../../state/hooks/settings';
import { FollowingMembersPlaceholder } from '../components';
import { ThreadViewFollowing } from './ThreadViewFollowing';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useCanMessage } from '../hooks/useCanMessage';
import { RoomInputPlaceholder } from '../RoomInputPlaceholder';

type ThreadViewProps = {
  threadTimeline: ThreadTimeline;
  threadFocusRef: MutableRefObject<boolean>;
  requestClose: () => void;
};

export function ThreadView({ threadTimeline, threadFocusRef, requestClose }: ThreadViewProps) {
  const screenSize = useScreenSizeContext();
  const editor = useEditor();
  const threadInputRef = useRef<HTMLDivElement>(null);
  const threadViewRef = useRef<HTMLDivElement>(null);
  const [hideActivity] = useSetting('hideActivity');

  const canMessage = useCanMessage();

  useThreadFocus(threadTimeline.threadId, threadFocusRef, threadViewRef);
  useEditorAutoFocus(editor, threadFocusRef, true);

  return (
    <Page
      ref={threadViewRef}
      style={{
        width: screenSize === ScreenSize.Desktop ? toRem(496) : '100%',
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
      <PageHeader>
        <Box grow="Yes" alignItems="Center" gap="200">
          <Box grow="Yes">
            <Text size="H5" truncate>
              Thread
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center">
            <TooltipProvider
              position="Bottom"
              align="End"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>Close</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton ref={triggerRef} variant="Surface" onClick={requestClose}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              )}
            </TooltipProvider>
          </Box>
        </Box>
      </PageHeader>

      <TimelineView timeline={threadTimeline} threadInputRef={threadInputRef} editor={editor} />
      <Box shrink="No" direction="Column">
        <div style={{ padding: `0 ${config.space.S400}` }}>
          {canMessage ? (
            <RoomInput
              editor={editor}
              fileDropContainerRef={threadViewRef}
              ref={threadInputRef}
              threadId={threadTimeline.threadId}
            />
          ) : (
            <RoomInputPlaceholder
              style={{ padding: config.space.S200 }}
              alignItems="Center"
              justifyContent="Center"
            >
              <Text align="Center">No permission</Text>
            </RoomInputPlaceholder>
          )}
        </div>
        {hideActivity ? (
          <FollowingMembersPlaceholder />
        ) : (
          <ThreadViewFollowing threadTimeline={threadTimeline} />
        )}
      </Box>
    </Page>
  );
}
