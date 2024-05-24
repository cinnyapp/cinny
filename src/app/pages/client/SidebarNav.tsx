import React, { useRef } from 'react';
import { Icon, Icons, AvatarFallback, Text, Scroll } from 'folds';

import {
  Sidebar,
  SidebarContent,
  SidebarStackSeparator,
  SidebarStack,
  SidebarAvatar,
  SidebarItemTooltip,
  SidebarItem,
} from '../../components/sidebar';
import { DirectTab, HomeTab, SpaceTabs, InboxTab, ExploreTab } from './sidebar';
import { openCreateRoom, openSearch, openSettings } from '../../../client/action/navigation';

export function SidebarNav() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <Sidebar>
      <SidebarContent
        scrollable={
          <Scroll ref={scrollRef} variant="Background" size="0">
            <SidebarStack>
              <HomeTab />
              <DirectTab />
            </SidebarStack>
            <SpaceTabs scrollRef={scrollRef} />
            <SidebarStackSeparator />
            <SidebarStack>
              <ExploreTab />
              <SidebarItem>
                <SidebarItemTooltip tooltip="Create Space">
                  {(triggerRef) => (
                    <SidebarAvatar
                      as="button"
                      ref={triggerRef}
                      outlined
                      onClick={() => openCreateRoom(true)}
                    >
                      <Icon src={Icons.Plus} />
                    </SidebarAvatar>
                  )}
                </SidebarItemTooltip>
              </SidebarItem>
            </SidebarStack>
          </Scroll>
        }
        sticky={
          <>
            <SidebarStackSeparator />
            <SidebarStack>
              <SidebarItem>
                <SidebarItemTooltip tooltip="Search">
                  {(triggerRef) => (
                    <SidebarAvatar
                      as="button"
                      ref={triggerRef}
                      outlined
                      onClick={() => openSearch()}
                    >
                      <Icon src={Icons.Search} />
                    </SidebarAvatar>
                  )}
                </SidebarItemTooltip>
              </SidebarItem>

              <InboxTab />
              <SidebarItem>
                <SidebarItemTooltip tooltip="User Settings">
                  {(triggerRef) => (
                    <SidebarAvatar as="button" ref={triggerRef} onClick={() => openSettings()}>
                      <AvatarFallback
                        style={{
                          backgroundColor: 'blue',
                          color: 'white',
                        }}
                      >
                        <Text size="T500">A</Text>
                      </AvatarFallback>
                    </SidebarAvatar>
                  )}
                </SidebarItemTooltip>
              </SidebarItem>
            </SidebarStack>
          </>
        }
      />
    </Sidebar>
  );
}
