import { Box, config, Icon, Icons, Text } from 'folds';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import React from 'react';
import { Room } from 'matrix-js-sdk';
import { UserAvatar } from '../../components/user-avatar';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { StackedAvatar } from '../../components/stacked-avatar';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { getMouseEventCords } from '../../utils/dom';

type MemberGlanceProps = {
  room: Room;
  members: CallMembership[];
  max?: number;
};
export function MemberGlance({ room, members, max = 6 }: MemberGlanceProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const openUserProfile = useOpenUserRoomProfile();

  const visibleMembers = members.slice(0, max);
  const remainingCount = max && members.length > max ? members.length - max : 0;

  return (
    <Box alignItems="Center">
      {visibleMembers.map((callMember) => {
        const userId = callMember.sender;
        if (!userId) return null;
        const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
        const avatarMxc = getMemberAvatarMxc(room, userId);
        const avatarUrl = avatarMxc
          ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96) ?? undefined
          : undefined;

        return (
          <StackedAvatar
            key={callMember.membershipID}
            title={name}
            as="button"
            variant="Background"
            size="200"
            radii="Pill"
            onClick={(evt) =>
              openUserProfile(
                room.roomId,
                undefined,
                userId,
                getMouseEventCords(evt.nativeEvent),
                'Top'
              )
            }
          >
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              alt={name}
              renderFallback={() => <Icon size="50" src={Icons.User} filled />}
            />
          </StackedAvatar>
        );
      })}
      {remainingCount > 0 && (
        <Text size="L400" style={{ paddingLeft: config.space.S100 }}>
          +{remainingCount}
        </Text>
      )}
    </Box>
  );
}
