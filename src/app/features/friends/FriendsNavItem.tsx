import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { NavButton, NavItem, NavItemContent } from '../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { getFriendsPath } from '../../pages/pathUtils';
import { useFriends } from './useFriends';

// The "Friends" entry at the top of the DM list, like Discord: friends and DMs live in one place.
export function FriendsNavItem() {
  const navigate = useNavigate();
  const { lists } = useFriends();
  const incomingCount = lists?.incoming.length ?? 0;
  const selected = !!useMatch({ path: getFriendsPath(), caseSensitive: true, end: true });

  return (
    <NavItem variant="Background" radii="400" aria-selected={selected}>
      <NavButton onClick={() => navigate(getFriendsPath())}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="200">
            <Avatar size="200" radii="400">
              <Icon src={Icons.User} size="100" filled={selected} />
            </Avatar>
            <Box as="span" grow="Yes">
              <Text as="span" size="Inherit" truncate>
                Friends
              </Text>
            </Box>
            {incomingCount > 0 && (
              <UnreadBadgeCenter>
                <UnreadBadge highlight count={incomingCount} />
              </UnreadBadgeCenter>
            )}
          </Box>
        </NavItemContent>
      </NavButton>
    </NavItem>
  );
}
