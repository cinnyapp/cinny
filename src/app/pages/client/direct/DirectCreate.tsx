import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Icon, IconButton, Icons, Scroll } from 'folds';
import { getDirectCreateSearchParams } from '../../pathSearchParam';
import { getDirectRoomPath } from '../../pathUtils';
import { getUserDirectRooms } from '../../../utils/matrix';
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
import { useClient } from '../../../hooks/useClient';

export function DirectCreate() {
  const ct = useClient();
  const screenSize = useScreenSizeContext();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = getDirectCreateSearchParams(searchParams);

  useEffect(() => {
    if (userId) {
      const directRooms = getUserDirectRooms(ct, userId);
      if (directRooms.length > 0) {
        const roomId = directRooms[0];
        navigate(getDirectRoomPath(roomId), { replace: true });
      }
    }
  }, [ct, navigate, userId]);

  return (
    <Page>
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
