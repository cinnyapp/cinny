import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, Scroll } from 'folds';
import {
  Page,
  PageContent,
  PageContentCenter,
  PageHero,
  PageHeroSection,
} from '../../../components/page';
import { CreateSpaceForm } from '../../../features/create-space';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';

export function Create() {
  const { t } = useTranslation('createSpace');
  const { navigateSpace } = useRoomNavigate();

  return (
    <Page>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <PageHeroSection>
                <Box direction="Column" gap="700">
                  <PageHero
                    icon={<Icon size="600" src={Icons.Space} />}
                    title={t('createSpaceTitle', { defaultValue: 'Create Space' })}
                    subTitle={t('createSpaceHeroSubtitle', {
                      defaultValue: 'Build a space for your community.',
                    })}
                  />
                  <CreateSpaceForm onCreate={navigateSpace} />
                </Box>
              </PageHeroSection>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
