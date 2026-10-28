import React, { ReactElement } from 'react';
import { Icon, Icons } from 'folds';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { UnreadBadge } from '../../../components/unread-badge';
import { getDirectPath, joinPathComponent } from '../../pathUtils';
import { useFriends, useFriendsPoller } from '../../../features/friends/useFriends';
import { useAutoAcceptFriendDMs } from '../../../features/friends/useAutoAcceptFriendDMs';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useDirectSelected } from '../../../hooks/router/useDirectSelected';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { useDirects } from '../../../state/hooks/roomList';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';

// Upstream's SidebarItemTooltip returns ReactNode, which this repo's React types reject as a JSX
// component (TS2786, reported for every upstream tab). Narrow the return type so our file typechecks.
const FriendsTooltip = SidebarItemTooltip as (
  props: Parameters<typeof SidebarItemTooltip>[0]
) => ReactElement | null;

// One tab for friends and DMs, like Discord. It replaces upstream's DirectTab in the sidebar.
export function FriendsTab() {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const screenSize = useScreenSizeContext();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());
  // The sidebar is always mounted, so this is the app's single friends poller.
  useFriendsPoller();
  useAutoAcceptFriendDMs();
  const { lists } = useFriends();
  const incomingCount = lists?.incoming.length ?? 0;

  const mDirects = useAtomValue(mDirectAtom);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const directUnread = useRoomsUnread(directs, roomToUnreadAtom);
  const total = (directUnread?.total ?? 0) + incomingCount;
  const highlight = incomingCount > 0 || (directUnread?.highlight ?? 0) > 0;

  const selected = useDirectSelected();

  // Back to the DM or the friends list you had open, as upstream's DirectTab does.
  const handleClick = () => {
    const activePath = navToActivePath.get('direct');
    if (activePath && screenSize !== ScreenSize.Mobile) {
      navigate(joinPathComponent(activePath));
      return;
    }
    navigate(getDirectPath());
  };

  return (
    <SidebarItem active={selected}>
      <FriendsTooltip tooltip="Friends and Messages">
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} outlined onClick={handleClick}>
            <Icon src={Icons.User} filled={selected} />
          </SidebarAvatar>
        )}
      </FriendsTooltip>
      {(directUnread || incomingCount > 0) && (
        <SidebarItemBadge hasCount={total > 0}>
          <UnreadBadge highlight={highlight} count={total} />
        </SidebarItemBadge>
      )}
    </SidebarItem>
  );
}
