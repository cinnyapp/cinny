import React from 'react';
import { Box, Icon, IconButton, Icons, Scroll, Text, Tooltip, TooltipProvider } from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import { Page, PageHeader } from '../../../components/page';
import * as css from './styles.css';
import { useRoom } from '../../../hooks/useRoom';
import { useThreadClose } from '../../../state/hooks/roomToActiveThread';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';

type ThreadViewProps = {
  threadId: string;
};
export function ThreadView({ threadId }: ThreadViewProps) {
  const room = useRoom();
  const screenSize = useScreenSizeContext();
  const floating = screenSize !== ScreenSize.Desktop;

  const closeThread = useThreadClose(room.roomId);

  const thread = room.getThread(threadId);
  const events = thread?.events ?? [];

  return (
    <FocusTrap
      paused={!floating}
      focusTrapOptions={{
        initialFocus: false,
        clickOutsideDeactivates: true,
        onDeactivate: floating ? closeThread : undefined,
      }}
    >
      <Page
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
                  <IconButton ref={triggerRef} variant="Surface" onClick={closeThread}>
                    <Icon src={Icons.Cross} />
                  </IconButton>
                )}
              </TooltipProvider>
            </Box>
          </Box>
        </PageHeader>
        <Box grow="Yes" direction="Column">
          <Scroll visibility="Hover" hideTrack>
            <div>
              {events.map((mEvent) => (
                <p style={{ padding: `8px 16px` }} key={mEvent.getId()}>
                  {mEvent.sender?.name}: {mEvent.getContent().body}
                </p>
              ))}
            </div>
          </Scroll>
        </Box>
      </Page>
    </FocusTrap>
  );
}
