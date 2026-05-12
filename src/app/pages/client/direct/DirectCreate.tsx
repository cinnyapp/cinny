import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Icon, IconButton, Icons, Scroll } from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getDirectCreateSearchParams } from '../../pathSearchParam';
import { getDirectRoomPath } from '../../pathUtils';
import { getDMRoomFor } from '../../../utils/matrix';
import { useDirectRooms } from './useDirectRooms';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import {
  Page,
  PageContent,
  PageContentCenter,
  PageHeader,
  PageHero,
  PageHeroSection,
} from '../../../components/page';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { CreateChat } from '../../../features/create-chat';
import { useTheme } from '../../../hooks/useTheme';

export function DirectCreate() {
  const mx = useMatrixClient();
  const screenSize = useScreenSizeContext();
  const theme = useTheme();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = getDirectCreateSearchParams(searchParams);

  const directs = useDirectRooms();

  useEffect(() => {
    if (userId) {
      const roomId = getDMRoomFor(mx, userId)?.roomId;
      if (roomId && directs.includes(roomId)) {
        navigate(getDirectRoomPath(roomId), { replace: true });
      }
    }
  }, [mx, navigate, directs, userId]);

  return (
    <Page transparent={theme.flat}>
      {screenSize === ScreenSize.Mobile && (
        <PageHeader balance outlined={false}>
          <Box grow="Yes" alignItems="Center" gap="200">
            <BackRouteHandler>
              {(onBack) => (
                <IconButton onClick={onBack}>
                  <Icon src={Icons.ArrowLeft} />
                </IconButton>
              )}
            </BackRouteHandler>
          </Box>
        </PageHeader>
      )}
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <PageHeroSection>
                <Box direction="Column" gap="700">
                  <PageHero
                    icon={<Icon size="600" src={Icons.Mention} />}
                    title="Create Chat"
                    subTitle="Start a private, encrypted chat by entering a user ID."
                  />
                  <CreateChat defaultUserId={userId} />
                </Box>
              </PageHeroSection>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
