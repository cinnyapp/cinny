import React from 'react';
import { Outlet } from 'react-router-dom';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { getNotificationsInvitesPath, getNotificationsMessagesPath } from '../../pathUtils';
import {
  useNotificationsInvitesSelected,
  useNotificationsMessagesSelected,
} from '../../../hooks/router/useNotifications';

export function Notifications() {
  const messagesSelected = useNotificationsMessagesSelected();
  const invitesSelected = useNotificationsInvitesSelected();

  return (
    <ClientContentLayout
      navigation={
        <ClientDrawerLayout>
          <ClientDrawerHeaderLayout>
            <Box grow="Yes" gap="300">
              <Box grow="Yes">
                <Text size="H4" truncate>
                  Notifications
                </Text>
              </Box>
            </Box>
          </ClientDrawerHeaderLayout>

          <ClientDrawerContentLayout>
            <Box direction="Column" gap="300">
              <NavCategory>
                <NavItem variant="Background" radii="400" aria-selected={messagesSelected}>
                  <NavLink to={getNotificationsMessagesPath()}>
                    <NavItemContent size="T300">
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.MessageUnread} size="100" filled={messagesSelected} />
                        </Avatar>
                        <Box as="span" grow="Yes">
                          <Text as="span" size="Inherit" truncate>
                            Messages
                          </Text>
                        </Box>
                      </Box>
                    </NavItemContent>
                  </NavLink>
                </NavItem>
                <NavItem variant="Background" radii="400" aria-selected={invitesSelected}>
                  <NavLink to={getNotificationsInvitesPath()}>
                    <NavItemContent size="T300">
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.Mail} size="100" filled={invitesSelected} />
                        </Avatar>
                        <Box as="span" grow="Yes">
                          <Text as="span" size="Inherit" truncate>
                            Invitations
                          </Text>
                        </Box>
                      </Box>
                    </NavItemContent>
                  </NavLink>
                </NavItem>
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
