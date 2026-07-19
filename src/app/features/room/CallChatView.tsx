import React from 'react';
import { useSetAtom } from 'jotai';
import { useParams } from 'react-router-dom';
import { Box, Text, TooltipProvider, Tooltip, Icon, Icons, IconButton, toRem } from 'folds';
import { Page, PageHeader } from '../../components/page';
import { callChatAtom } from '../../state/callEmbed';
import { RoomView } from './RoomView';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

export function CallChatView() {
  const { eventId } = useParams();
  const setChat = useSetAtom(callChatAtom);
  const screenSize = useScreenSizeContext();

  const handleClose = () => setChat(false);

  return (
    <Page
      style={{
        width: screenSize === ScreenSize.Desktop ? toRem(456) : '100%',
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
      <PageHeader>
        <Box grow="Yes" alignItems="Center" gap="200">
          <Box grow="Yes">
            <Text size="H5" truncate>
              Chat
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
                <IconButton ref={triggerRef} variant="Surface" onClick={handleClose}>
                  <Icon src={Icons.Cross} />
                </IconButton>
              )}
            </TooltipProvider>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes" direction="Column">
        <RoomView eventId={eventId} />
      </Box>
    </Page>
  );
}
