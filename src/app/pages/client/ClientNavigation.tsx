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
import { getExplorePath, getInboxPath } from '../pathUtils';
import { DirectTab, HomeTab, SpaceTabs } from './sidebar';
import { useExploreSelected } from '../../hooks/router/useExploreSelected';
import { useInboxSelected } from '../../hooks/router/useInbox';

export function ClientNavigation() {
  const navigate = useNavigate();

  const inboxSelected = useInboxSelected();
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
              <SidebarAvatar
                active={inboxSelected}
                outlined
                tooltip="Inbox"
                avatarChildren={<Icon src={Icons.Bell} filled={inboxSelected} />}
                onClick={() => navigate(getInboxPath())}
              />
              <SidebarAvatar
                tooltip="User Settings"
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
