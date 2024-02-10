import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { useAtomValue } from 'jotai';
import { useDirects } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getDirectPath, getDirectRoomPath } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { SidebarAvatar } from '../../../components/sidebar';
import { NotificationBadge, UnreadMenu } from './NotificationBadge';
import { useDirectSelected } from '../../../hooks/router/useDirectSelected';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';

export function DirectTab() {
  const navigate = useNavigate();
  const mx = useMatrixClient();

  const mDirects = useAtomValue(mDirectAtom);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const directUnread = useRoomsUnread(directs, roomToUnreadAtom);

  const directSelected = useDirectSelected();

  const getRoomToLink = (roomId: string) =>
    getDirectRoomPath(getCanonicalAliasOrRoomId(mx, roomId));

  const handleDirectClick = () => {
    navigate(getDirectPath());
  };

  return (
    <SidebarAvatar
      active={directSelected}
      outlined
      tooltip="Direct Messages"
      hasCount={directUnread && directUnread.total > 0}
      notificationBadge={() =>
        directUnread && (
          <NotificationBadge
            unread={directUnread}
            renderUnreadMenu={(requestClose) => (
              <UnreadMenu
                rooms={[...(directUnread.from ?? [])]}
                getToLink={getRoomToLink}
                requestClose={requestClose}
              />
            )}
          />
        )
      }
      avatarChildren={<Icon src={Icons.User} filled={directSelected} />}
      onClick={handleDirectClick}
    />
  );
}
