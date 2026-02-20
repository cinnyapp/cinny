import { Avatar, Box, Icon, Icons, Text } from 'folds';
import React from 'react';
import { Room } from 'matrix-js-sdk';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { NavButton, NavItem, NavItemContent } from '../../components/nav';
import { UserAvatar } from '../../components/user-avatar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useCallState } from '../../pages/client/call/CallProvider';
import { getMxIdLocalPart } from '../../utils/matrix';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../hooks/useSpace';

type RoomNavUserProps = {
  room: Room;
  callMembership: CallMembership;
};
export function RoomNavUser({ room, callMembership }: RoomNavUserProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const openProfile = useOpenUserRoomProfile();
  const space = useSpaceOptionally();
  const { isActiveCallReady, activeCallRoomId } = useCallState();
  const isActiveCall = isActiveCallReady && activeCallRoomId === room.roomId;
  const userId = callMembership.sender ?? '';
  const avatarMxcUrl = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxcUrl
    ? mx.mxcUrlToHttp(avatarMxcUrl, 32, 32, 'crop', undefined, false, useAuthentication)
    : undefined;
  const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId);
  const isCallParticipant = isActiveCall && userId !== mx.getUserId();

  const handleNavUserClick: React.MouseEventHandler<HTMLButtonElement> = (evt) => {
    openProfile(room.roomId, space?.roomId, userId, evt.currentTarget.getBoundingClientRect());
  };

  const ariaLabel = isCallParticipant ? `Call Participant: ${name}` : name;

  return (
    <NavItem variant="Background" radii="400">
      <NavButton onClick={handleNavUserClick} aria-label={ariaLabel}>
        <NavItemContent as="div">
          <Box direction="Column" grow="Yes" gap="200" justifyContent="Stretch">
            <Box alignItems="Center" gap="200">
              <Avatar size="200">
                <UserAvatar
                  userId={userId}
                  src={avatarUrl ?? undefined}
                  alt={name}
                  renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                />
              </Avatar>
              <Text as="span" size="B400" priority="300" truncate>
                {name}
              </Text>
            </Box>
          </Box>
        </NavItemContent>
      </NavButton>
    </NavItem>
  );
}
