import React from 'react';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { getInboxInvitesPath, getInboxNotificationsPath } from '../../pathUtils';
import {
  useInboxInvitesSelected,
  useInboxNotificationsSelected,
} from '../../../hooks/router/useInbox';
import { UnreadBadge } from '../../../components/unread-badge';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';

function InvitesNavItem() {
  const invitesSelected = useInboxInvitesSelected();
  const allInvites = useAtomValue(allInvitesAtom);
  const inviteCount = allInvites.length;

  return (
    <NavItem
      variant="Background"
      radii="400"
      highlight={inviteCount > 0}
      aria-selected={invitesSelected}
    >
      <NavLink to={getInboxInvitesPath()}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="200">
            <Avatar size="200" radii="400">
              <Icon src={Icons.Mail} size="100" filled={invitesSelected} />
            </Avatar>
            <Box as="span" grow="Yes">
              <Text as="span" size="Inherit" truncate>
                Invitations
              </Text>
            </Box>
            {inviteCount > 0 && <UnreadBadge highlight count={inviteCount} />}
          </Box>
        </NavItemContent>
      </NavLink>
    </NavItem>
  );
}

export function Inbox() {
  useNavToActivePathMapper('inbox');
  const notificationsSelected = useInboxNotificationsSelected();

  return (
    <PageNav>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Inbox
            </Text>
          </Box>
        </Box>
      </PageNavHeader>

      <PageNavContent>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={notificationsSelected}>
              <NavLink to={getInboxNotificationsPath()}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.MessageUnread} size="100" filled={notificationsSelected} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        Notifications
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavLink>
            </NavItem>
            <InvitesNavItem />
          </NavCategory>
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
