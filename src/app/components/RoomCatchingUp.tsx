import React from 'react';
import { Box, Icon, IconButton, Icons, Spinner, Text } from 'folds';
import { Page, PageHeader } from './page';
import { BackRouteHandler } from './BackRouteHandler';
import { ScreenSize, useScreenSizeContext } from '../hooks/useScreenSize';

type RoomCatchingUpProps = {
  done: number;
  total: number;
};

/**
 * Placeholder for a routed chat that the staged start-up has not rebuilt yet
 * (it is older than the stage-1 cut). Replaced by the real room the moment it
 * lands; never a "Join" screen for a chat the user is already in.
 */
export function RoomCatchingUp({ done, total }: RoomCatchingUpProps) {
  const screenSize = useScreenSizeContext();

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" gap="200">
          <Box shrink="No">
            {screenSize === ScreenSize.Mobile && (
              <BackRouteHandler>
                {(onBack) => (
                  <IconButton onClick={onBack}>
                    <Icon src={Icons.ArrowLeft} />
                  </IconButton>
                )}
              </BackRouteHandler>
            )}
          </Box>
          <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Opening…
            </Text>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes" direction="Column" alignItems="Center" justifyContent="Center" gap="300">
        <Spinner variant="Secondary" size="600" />
        <Text size="T300" priority="300" data-testid="room-catching-up">
          {total > 0
            ? `Still loading your older chats (${done.toLocaleString()} of ${total.toLocaleString()})`
            : 'Still loading your older chats…'}
        </Text>
      </Box>
    </Page>
  );
}
