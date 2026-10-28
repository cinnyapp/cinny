import React from 'react';
import { Avatar, Icon, Icons } from 'folds';
import { UserAvatar } from '../../components/user-avatar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { friendAvatarUrl, friendDisplayName } from './userDisplay';

type FriendAvatarProps = {
  userId: string;
};
export function FriendAvatar({ userId }: FriendAvatarProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  return (
    <Avatar size="300">
      <UserAvatar
        userId={userId}
        src={friendAvatarUrl(mx, userId, useAuthentication)}
        alt={friendDisplayName(mx, userId)}
        renderFallback={() => <Icon size="100" src={Icons.User} filled />}
      />
    </Avatar>
  );
}
