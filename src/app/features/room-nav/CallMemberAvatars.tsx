import React from 'react';
import { Room } from 'matrix-js-sdk';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { Avatar, Box, Icon, Icons, Text, Tooltip, TooltipProvider, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { uniqueCallUserIds } from './callMembers';

const MAX_SHOWN = 8;

function CallMemberAvatar({ room, userId }: { room: Room; userId: string }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 48, 48) ?? undefined
    : undefined;

  return (
    <TooltipProvider
      position="Top"
      offset={4}
      tooltip={
        <Tooltip>
          <Text size="T300">{name}</Text>
        </Tooltip>
      }
    >
      {(triggerRef) => (
        <Avatar ref={triggerRef} size="200" radii="Pill" aria-label={name}>
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            alt={name}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      )}
    </TooltipProvider>
  );
}

// Discord-style: who's in the voice room, as a row of faces under its name.
export function CallMemberAvatars({ room, members }: { room: Room; members: CallMembership[] }) {
  const userIds = uniqueCallUserIds(members);
  if (userIds.length === 0) return null;
  const hidden = userIds.length - MAX_SHOWN;

  return (
    <Box
      wrap="Wrap"
      alignItems="Center"
      gap="100"
      style={{ padding: `${config.space.S100} ${config.space.S200} ${config.space.S200} 2.25rem` }}
    >
      {userIds.slice(0, MAX_SHOWN).map((userId) => (
        <CallMemberAvatar key={userId} room={room} userId={userId} />
      ))}
      {hidden > 0 && (
        <Text size="T200" priority="300">
          +{hidden}
        </Text>
      )}
    </Box>
  );
}
