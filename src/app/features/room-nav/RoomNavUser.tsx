import { Avatar, Box, Icon, Icons, Text } from 'folds';
import React from 'react';
import { Room } from 'matrix-js-sdk';
import { NavItem, NavItemContent } from '../../components/nav';
import { UserAvatar } from '../../components/user-avatar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { getMxIdLocalPart } from '../../utils/matrix';
import { getMemberDisplayName } from '../../utils/room';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

type RoomNavUserProps = {
  room: Room;
  space: Room;
  sender: string;
};
export function RoomNavUser({ room, space, sender }: RoomNavUserProps) {
  const mx = useMatrixClient();
  const members = useRoomMembers(mx, space.roomId);
  const useAuthentication = useMediaAuthentication();

  const member = members.find((roomMember) => roomMember.userId === sender);
  const avatarMxcUrl = member?.getMxcAvatarUrl();
  const avatarUrl = avatarMxcUrl
    ? mx.mxcUrlToHttp(avatarMxcUrl, 32, 32, 'crop', undefined, false, useAuthentication)
    : undefined;
  const getName =
    getMemberDisplayName(room, member?.userId ?? '') ??
    getMxIdLocalPart(member?.userId ?? '') ??
    member?.userId;

  return (
    <NavItem variant="Background" radii="400">
      <NavItemContent>
        <Box as="span" grow="Yes" alignItems="Center" gap="200">
          <Avatar size="200">
            <UserAvatar
              userId={member?.userId ?? ''}
              src={avatarUrl ?? undefined}
              alt={getName}
              renderFallback={() => <Icon size="50" src={Icons.User} filled />}
            />
          </Avatar>
          <Text size="B400" priority="300" truncate>
            {getName}
          </Text>
        </Box>
      </NavItemContent>
    </NavItem>
  );
}
