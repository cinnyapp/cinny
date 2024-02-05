import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { useAtomValue } from 'jotai';
import { useDirects } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getDirectPath } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { SidebarAvatar } from '../../../components/sidebar';
import { NotificationBadge } from './NotificationBadge';
import { useDirectSelected } from '../../../hooks/useDirectSelected';

export function DirectTab() {
  const navigate = useNavigate();
  const mx = useMatrixClient();

  const mDirects = useAtomValue(mDirectAtom);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const directUnread = useRoomsUnread(directs, roomToUnreadAtom);

  const directSelected = useDirectSelected();

  const handleDirectClick = () => {
    navigate(getDirectPath());
  };

  return (
    <SidebarAvatar
      active={directSelected}
      outlined
      tooltip="Direct Messages"
      hasCount={directUnread && directUnread.total > 0}
      notificationBadge={() => directUnread && <NotificationBadge unread={directUnread} />}
      avatarChildren={<Icon src={Icons.User} filled={directSelected} />}
      onClick={handleDirectClick}
    />
  );
}
