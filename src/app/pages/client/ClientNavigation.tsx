import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Icon, Icons, AvatarFallback, Text } from 'folds';

import {
  Sidebar,
  SidebarContent,
  SidebarStackSeparator,
  SidebarStack,
  SidebarAvatar,
} from '../../components/sidebar';
import { getExplorePath, getNotificationsPath } from '../pathUtils';
import { DirectTab, HomeTab, SpaceTabs } from './sidebar';

export function ClientNavigation() {
  const navigate = useNavigate();

  const notificationMatch = useMatch(getNotificationsPath());
  const exploreMatch = useMatch(getExplorePath());

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
                active={!!exploreMatch}
                outlined
                tooltip="Explore Community"
                avatarChildren={<Icon src={Icons.Explore} filled={!!exploreMatch} />}
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
                active={!!notificationMatch}
                outlined
                tooltip="Notifications"
                avatarChildren={<Icon src={Icons.Bell} filled={!!notificationMatch} />}
                onClick={() => navigate(getNotificationsPath())}
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
