import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons, AvatarFallback, Text } from 'folds';

import {
  Sidebar,
  SidebarContent,
  SidebarStackSeparator,
  SidebarStack,
  SidebarAvatar,
} from '../../components/sidebar';
import { getExplorePath } from '../pathUtils';
import { DirectTab, HomeTab, SpaceTabs, InboxTab } from './sidebar';
import { useExploreSelected } from '../../hooks/router/useExploreSelected';
import { openSettings } from '../../../client/action/navigation';

export function ClientNavigation() {
  const navigate = useNavigate();

  const exploreSelected = useExploreSelected();

  return (
    <Sidebar>
      <SidebarContent
        scrollable={
          <>
            <SidebarStack>
              <HomeTab />
              <DirectTab />
            </SidebarStack>
            <SidebarStackSeparator />
            <SidebarStack>
              <SpaceTabs />
            </SidebarStack>
            <SidebarStackSeparator />
            <SidebarStack>
              <SidebarAvatar
                active={exploreSelected}
                outlined
                tooltip="Explore Community"
                avatarChildren={<Icon src={Icons.Explore} filled={exploreSelected} />}
                onClick={() => navigate(getExplorePath())}
              />
              <SidebarAvatar
                outlined
                tooltip="Create Space"
                avatarChildren={<Icon src={Icons.Plus} />}
              />
            </SidebarStack>
          </>
        }
        sticky={
          <>
            <SidebarStackSeparator />
            <SidebarStack>
              <SidebarAvatar
                outlined
                tooltip="Search"
                avatarChildren={<Icon src={Icons.Search} />}
              />
              <InboxTab />
              <SidebarAvatar
                tooltip="User Settings"
                onClick={() => openSettings()}
                avatarChildren={
                  <AvatarFallback
                    style={{
                      backgroundColor: 'blue',
                      color: 'white',
                    }}
                  >
                    <Text size="T500">A</Text>
                  </AvatarFallback>
                }
              />
            </SidebarStack>
          </>
        }
      />
    </Sidebar>
  );
}
