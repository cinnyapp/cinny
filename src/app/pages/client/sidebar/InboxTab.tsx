import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { useAtomValue } from 'jotai';
import { SidebarAvatar } from '../../../components/sidebar';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { getInboxPath } from '../../pathUtils';
import { useInboxSelected } from '../../../hooks/router/useInbox';
import { UnreadBadge } from '../../../components/unread-badge';

export function InboxTab() {
  const navigate = useNavigate();
  const inboxSelected = useInboxSelected();
  const allInvites = useAtomValue(allInvitesAtom);
  const inviteCount = allInvites.length;

  return (
    <SidebarAvatar
      active={inboxSelected}
      outlined
      tooltip="Inbox"
      avatarChildren={<Icon src={Icons.Inbox} filled={inboxSelected} />}
      onClick={() => navigate(getInboxPath())}
      notificationBadge={() => inviteCount > 0 && <UnreadBadge highlight count={inviteCount} />}
    />
  );
}
