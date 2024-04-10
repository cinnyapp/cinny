import React from 'react';
import { Icon, Icons, AvatarFallback, Text } from 'folds';

import {
  Sidebar,
  SidebarContent,
  SidebarStackSeparator,
  SidebarStack,
  SidebarAvatar,
} from '../../components/sidebar';
import { DirectTab, HomeTab, SpaceTabs, InboxTab, ExploreTab } from './sidebar';
import { openSettings } from '../../../client/action/navigation';

export function ClientNavigation() {
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
              <ExploreTab />
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
