import React, { MutableRefObject, useRef } from 'react';
import classNames from 'classnames';
import { Box, config, Icon, IconButton, Icons, Text, Tooltip, TooltipProvider } from 'folds';
import FocusTrap from 'focus-trap-react';
import * as css from './styles.css';
import { ThreadTimeline } from '../../../../client/room/ThreadTimeline';
import { Page, PageHeader } from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useEditor } from '../../../components/editor';
import { RoomInput } from '../RoomInput';
import { TimelineView } from './TimelineView';
import { useEditorAutoFocus, useThreadFocus } from '../hooks/useEditorAutoFocus';
import { settingsAtom } from '../../../state/settings';
import { useSetting } from '../../../state/hooks/settings';
import { FollowingMembersPlaceholder } from '../components';
import { ThreadViewFollowing } from './ThreadViewFollowing';

type ThreadViewProps = {
  threadTimeline: ThreadTimeline;
  threadFocusRef: MutableRefObject<boolean>;
  requestClose: () => void;
};

export function ThreadView({ threadTimeline, threadFocusRef, requestClose }: ThreadViewProps) {
  const screenSize = useScreenSizeContext();
  const floating = screenSize !== ScreenSize.Desktop;
  const editor = useEditor();
  const threadInputRef = useRef<HTMLDivElement>(null);
  const threadViewRef = useRef<HTMLDivElement>(null);
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');

  useThreadFocus(threadTimeline.threadId, threadFocusRef, threadViewRef);
  useEditorAutoFocus(editor, threadFocusRef, true);

  return (
    <FocusTrap
      paused={!floating}
      focusTrapOptions={{
        initialFocus: false,
        clickOutsideDeactivates: true,
        onDeactivate: floating ? requestClose : undefined,
      }}
    >
      <Page
        ref={threadViewRef}
        className={classNames(css.ThreadView, {
          [css.ThreadViewFloating]: floating,
        })}
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

        <TimelineView threadTimeline={threadTimeline} />
        <Box shrink="No" direction="Column">
          <div style={{ padding: `0 ${config.space.S400}` }}>
            <RoomInput
              editor={editor}
              fileDropContainerRef={threadViewRef}
              ref={threadInputRef}
              threadId={threadTimeline.threadId}
            />
          </div>
          {hideActivity ? (
            <FollowingMembersPlaceholder />
          ) : (
            <ThreadViewFollowing threadTimeline={threadTimeline} />
          )}
        </Box>
      </Page>
    </FocusTrap>
  );
}
