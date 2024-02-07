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
import { getHomePath, getHomeRoomPath } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { SidebarAvatar } from '../../../components/sidebar';
import { NotificationBadge, UnreadMenu } from './NotificationBadge';
import { useHomeSelected } from '../../../hooks/useHomeSelected';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';

export function HomeTab() {
  const navigate = useNavigate();
  const mx = useMatrixClient();

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
  const homeUnread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
  const homeSelected = useHomeSelected();

  const getRoomToLink = (roomId: string) => getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId));

  const handleHomeClick = () => {
    navigate(getHomePath());
  };

  return (
    <SidebarAvatar
      active={homeSelected}
      outlined
      tooltip="Home"
      hasCount={homeUnread && homeUnread.total > 0}
      notificationBadge={() =>
        homeUnread && (
          <NotificationBadge
            unread={homeUnread}
            renderUnreadMenu={(requestClose) => (
              <UnreadMenu
                rooms={[...(homeUnread.from ?? [])]}
                getToLink={getRoomToLink}
                requestClose={requestClose}
              />
            )}
          />
        )
      }
      avatarChildren={<Icon src={Icons.Home} filled={homeSelected} />}
      onClick={handleHomeClick}
    />
  );
}
