import React, { ReactElement } from 'react';
import { Icon, Icons } from 'folds';
import { useMatch, useNavigate } from 'react-router-dom';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { UnreadBadge } from '../../../components/unread-badge';
import { getFriendsPath } from '../../pathUtils';
import { useFriends, useFriendsPoller } from '../../../features/friends/useFriends';
import { useAutoAcceptFriendDMs } from '../../../features/friends/useAutoAcceptFriendDMs';

// Upstream's SidebarItemTooltip returns ReactNode, which this repo's React types reject as a JSX
// component (TS2786, reported for every upstream tab). Narrow the return type so our file typechecks.
const FriendsTooltip = SidebarItemTooltip as (
  props: Parameters<typeof SidebarItemTooltip>[0]
) => ReactElement | null;

export function FriendsTab() {
  const navigate = useNavigate();
  // The sidebar is always mounted, so this is the app's single friends poller.
  useFriendsPoller();
  useAutoAcceptFriendDMs();
  const { lists } = useFriends();
  const incomingCount = lists?.incoming.length ?? 0;

  const friendsSelected = !!useMatch({ path: getFriendsPath(), caseSensitive: true, end: false });

  return (
    <SidebarItem active={friendsSelected}>
      <FriendsTooltip tooltip="Friends">
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            ref={triggerRef}
            outlined
            onClick={() => navigate(getFriendsPath())}
          >
            <Icon src={Icons.User} filled={friendsSelected} />
          </SidebarAvatar>
        )}
      </FriendsTooltip>
      {incomingCount > 0 && (
        <SidebarItemBadge hasCount>
          <UnreadBadge highlight count={incomingCount} />
        </SidebarItemBadge>
      )}
    </SidebarItem>
  );
}
