import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { useAtomValue } from 'jotai';
import { useOrphanRooms } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getHomePath, joinPathComponent } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { useHomeSelected } from '../../../hooks/router/useHomeSelected';
import { navToActivePathAtom } from '../../../state/navToActivePath';
import { UnreadBadge } from '../../../components/unread-badge';

export function HomeTab() {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const navToActivePath = useAtomValue(navToActivePathAtom);

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
  const homeUnread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
  const homeSelected = useHomeSelected();

  const handleHomeClick = () => {
    const activePath = navToActivePath.get('home');
    if (activePath) {
      navigate(joinPathComponent(activePath));
      return;
    }

    navigate(getHomePath());
  };

  return (
    <SidebarItem active={homeSelected}>
      <SidebarItemTooltip tooltip="Home">
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} outlined onClick={handleHomeClick}>
            <Icon src={Icons.Home} filled={homeSelected} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {homeUnread && (
        <SidebarItemBadge hasCount={homeUnread.total > 0}>
          <UnreadBadge highlight={homeUnread.highlight > 0} count={homeUnread.total} />
        </SidebarItemBadge>
      )}
    </SidebarItem>
  );
}
