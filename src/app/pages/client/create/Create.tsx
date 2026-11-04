// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
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
                    title="Create Space"
                    subTitle="Build a space for your community."
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
