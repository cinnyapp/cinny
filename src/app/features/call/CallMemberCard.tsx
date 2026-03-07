import { CallMembership, SessionMembershipData } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import React, { useState } from 'react';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { SequenceCard } from '../../components/sequence-card';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { useRoom } from '../../hooks/useRoom';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { UserAvatar } from '../../components/user-avatar';
import { getMouseEventCords } from '../../utils/dom';
import * as css from './styles.css';

interface MemberWithMembershipData {
  membershipData?: SessionMembershipData & {
    'm.call.intent': 'video' | 'audio';
  };
}

type CallMemberCardProps = {
  member: CallMembership;
};
export function CallMemberCard({ member }: CallMemberCardProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const room = useRoom();

  const openUserProfile = useOpenUserRoomProfile();

  const userId = member.sender;
  if (!userId) return null;

  const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96) ?? undefined
    : undefined;

  const audioOnly =
    (member as unknown as MemberWithMembershipData).membershipData?.['m.call.intent'] === 'audio';

  return (
    <SequenceCard
      as="button"
      key={member.membershipID}
      className={css.CallMemberCard}
      variant="SurfaceVariant"
      radii="500"
      onClick={(evt: any) =>
        openUserProfile(
          room.roomId,
          undefined,
          userId,
          getMouseEventCords(evt.nativeEvent),
          'Right'
        )
      }
    >
      <Box grow="Yes" gap="300" alignItems="Center">
        <Avatar size="200" radii="400">
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            alt={name}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
        <Box grow="Yes">
          <Text size="L400" truncate>
            {name}
          </Text>
        </Box>
        {audioOnly && <Icon src={Icons.VideoCameraMute} size="100" />}
      </Box>
    </SequenceCard>
  );
}

export function CallMemberRenderer({
  members,
  max = 4,
}: {
  members: CallMembership[];
  max?: number;
}) {
  const [viewMore, setViewMore] = useState(false);

  const truncatedMembers = viewMore ? members : members.slice(0, 4);
  const remaining = members.length - truncatedMembers.length;

  return (
    <>
      {truncatedMembers.map((member) => (
        <CallMemberCard key={member.membershipID} member={member} />
      ))}
      {members.length > max && (
        <SequenceCard
          as="button"
          className={css.CallMemberCard}
          variant="SurfaceVariant"
          radii="500"
          onClick={() => setViewMore(!viewMore)}
        >
          <Box grow="Yes" gap="300" alignItems="Center">
            {viewMore ? (
              <Text size="L400" truncate>
                Collapse
              </Text>
            ) : (
              <Text size="L400" truncate>
                {remaining === 0 ? `+${remaining} Other` : `+${remaining} Others`}
              </Text>
            )}
          </Box>
          <Icon src={viewMore ? Icons.ChevronTop : Icons.ChevronBottom} size="100" />
        </SequenceCard>
      )}
    </>
  );
}
