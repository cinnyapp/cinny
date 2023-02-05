import React from 'react';
import { Icon, Icons, Badge, AvatarFallback, Text } from 'folds';
import { useAtom } from 'jotai';

import {
  Sidebar,
  SidebarContent,
  SidebarStackSeparator,
  SidebarStack,
  SidebarAvatar,
} from '../../components/sidebar';
import { selectedTabAtom, SidebarTab } from '../../state/selectedTab';

export function Sidebar1() {
  const [selectedTab, setSelectedTab] = useAtom(selectedTabAtom);

  return (
    <Sidebar>
      <SidebarContent
        scrollable={
          <>
            <SidebarStack>
              <SidebarAvatar
                active={selectedTab === SidebarTab.Home}
                outlined
                tooltip="Home"
                avatarChildren={<Icon src={Icons.Home} filled />}
                onClick={() => setSelectedTab(SidebarTab.Home)}
              />
              <SidebarAvatar
                active={selectedTab === SidebarTab.People}
                outlined
                tooltip="People"
                avatarChildren={<Icon src={Icons.User} />}
                onClick={() => setSelectedTab(SidebarTab.People)}
              />
            </SidebarStack>
            <SidebarStackSeparator />
            <SidebarStack>
              <SidebarAvatar
                tooltip="Space A"
                notificationBadge={(badgeClassName) => (
                  <Badge
                    className={badgeClassName}
                    size="200"
                    variant="Secondary"
                    fill="Solid"
                    radii="Pill"
                  />
                )}
                avatarChildren={
                  <AvatarFallback
                    style={{
                      backgroundColor: 'red',
                      color: 'white',
                    }}
                  >
                    <Text size="T500">B</Text>
                  </AvatarFallback>
                }
              />
              <SidebarAvatar
                tooltip="Space B"
                hasCount
                notificationBadge={(badgeClassName) => (
                  <Badge className={badgeClassName} radii="Pill" fill="Solid" variant="Secondary">
                    <Text size="L400">64</Text>
                  </Badge>
                )}
                avatarChildren={
                  <AvatarFallback
                    style={{
                      backgroundColor: 'green',
                      color: 'white',
                    }}
                  >
                    <Text size="T500">C</Text>
                  </AvatarFallback>
                }
              />
            </SidebarStack>
            <SidebarStackSeparator />
            <SidebarStack>
              <SidebarAvatar
                outlined
                tooltip="Explore Community"
                avatarChildren={<Icon src={Icons.Explore} />}
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
