import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Icon, Icons, MenuItem, Text, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Presence, useUserPresence } from '../../hooks/useUserPresence';
import { AvatarPresence, PresenceBadge } from '../../components/presence';
import { getDirectCreatePath, withSearchParam } from '../../pages/pathUtils';
import { DirectCreateSearchParams } from '../../pages/paths';
import { isOnline } from './presence';
import { friendDisplayName } from './userDisplay';
import { FriendAvatar } from './FriendAvatar';

type FriendRowProps = {
  userId: string;
};
export function FriendRow({ userId }: FriendRowProps) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const presence = useUserPresence(userId);
  const online = isOnline(presence?.presence);
  const name = friendDisplayName(mx, userId);

  const handleMessage = () => {
    const directSearchParam: DirectCreateSearchParams = { userId };
    navigate(withSearchParam(getDirectCreatePath(), directSearchParam));
  };

  return (
    <MenuItem
      style={{ padding: `${config.space.S100} ${config.space.S200}`, height: 'auto' }}
      variant="Background"
      radii="400"
      onClick={handleMessage}
      aria-label={`Message ${name}`}
      before={
        <AvatarPresence
          variant="Background"
          badge={
            <PresenceBadge
              presence={online && presence ? presence.presence : Presence.Offline}
              status={presence?.status}
              size="200"
            />
          }
        >
          <FriendAvatar userId={userId} />
        </AvatarPresence>
      }
      after={<Icon size="100" src={Icons.Message} />}
    >
      <Box grow="Yes" direction="Column">
        <Text size="T400" truncate>
          {name}
        </Text>
        <Text size="T200" priority="300" truncate>
          {userId}
        </Text>
      </Box>
    </MenuItem>
  );
}
