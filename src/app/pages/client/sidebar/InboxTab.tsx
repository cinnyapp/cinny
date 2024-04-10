import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { useAtomValue } from 'jotai';
import { SidebarAvatar } from '../../../components/sidebar';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { getInboxPath, joinPathComponent } from '../../pathUtils';
import { useInboxSelected } from '../../../hooks/router/useInbox';
import { UnreadBadge } from '../../../components/unread-badge';
import { navToActivePathAtom } from '../../../state/navToActivePath';

export function InboxTab() {
  const navigate = useNavigate();
  const navToActivePath = useAtomValue(navToActivePathAtom);
  const inboxSelected = useInboxSelected();
  const allInvites = useAtomValue(allInvitesAtom);
  const inviteCount = allInvites.length;

  const handleInboxClick = () => {
    const activePath = navToActivePath.get('inbox');
    if (activePath) {
      navigate(joinPathComponent(activePath));
      return;
    }

    navigate(getInboxPath());
  };

  return (
    <SidebarAvatar
      active={inboxSelected}
      outlined
      tooltip="Inbox"
      avatarChildren={<Icon src={Icons.Inbox} filled={inboxSelected} />}
      onClick={handleInboxClick}
      notificationBadge={() => inviteCount > 0 && <UnreadBadge highlight count={inviteCount} />}
    />
  );
}
