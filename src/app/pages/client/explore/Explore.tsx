import React from 'react';
import { Outlet } from 'react-router-dom';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import {
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { getExploreFeaturedPath, getExploreServerPath } from '../../pathUtils';
import { clientDefaultServer, useClientConfig } from '../../../hooks/useClientConfig';
import { useExploreFeaturedSelected, useExploreServer } from '../../../hooks/router/useExplore';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdServer } from '../../../utils/matrix';

export function Explore() {
  const mx = useMatrixClient();
  const userId = mx.getUserId();
  const clientConfig = useClientConfig();
  const userServer = userId ? getMxIdServer(userId) : undefined;
  const servers = clientConfig.homeserverList ?? [clientDefaultServer(clientConfig)];

  const featuredSelected = useExploreFeaturedSelected();
  const selectedServer = useExploreServer();

  return (
    <ClientContentLayout
      navigation={
        <ClientDrawerLayout>
          <ClientDrawerHeaderLayout>
            <Box grow="Yes" gap="300">
              <Box grow="Yes">
                <Text size="H4" truncate>
                  Explore Community
                </Text>
              </Box>
            </Box>
          </ClientDrawerHeaderLayout>

          <ClientDrawerContentLayout>
            <Box direction="Column" gap="300">
              <NavCategory>
                <NavItem variant="Background" radii="400" aria-selected={featuredSelected}>
                  <NavLink to={getExploreFeaturedPath()}>
                    <NavItemContent size="T300">
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.Bulb} size="100" filled={featuredSelected} />
                        </Avatar>
                        <Box as="span" grow="Yes">
                          <Text as="span" size="Inherit" truncate>
                            Featured
                          </Text>
                        </Box>
                      </Box>
                    </NavItemContent>
                  </NavLink>
                </NavItem>
              </NavCategory>
              <NavCategory>
                <NavCategoryHeader>
                  <Text size="O400">Servers</Text>
                </NavCategoryHeader>
                {userServer && !servers.includes(userServer) && (
                  <NavItem
                    variant="Background"
                    radii="400"
                    aria-selected={selectedServer === userServer}
                  >
                    <NavLink to={getExploreServerPath(userServer)}>
                      <NavItemContent size="T300">
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <Icon
                              src={Icons.Category}
                              size="100"
                              filled={selectedServer === userServer}
                            />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              {userServer}
                            </Text>
                          </Box>
                        </Box>
                      </NavItemContent>
                    </NavLink>
                  </NavItem>
                )}
                {servers.map((server) => (
                  <NavItem
                    key={server}
                    variant="Background"
                    radii="400"
                    aria-selected={server === selectedServer}
                  >
                    <NavLink to={getExploreServerPath(server)}>
                      <NavItemContent size="T300">
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <Icon
                              src={Icons.Category}
                              size="100"
                              filled={server === selectedServer}
                            />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              {server}
                            </Text>
                          </Box>
                        </Box>
                      </NavItemContent>
                    </NavLink>
                  </NavItem>
                ))}
              </NavCategory>
            </Box>
          </ClientDrawerContentLayout>
        </ClientDrawerLayout>
      }
    >
      <Outlet />
    </ClientContentLayout>
  );
}
