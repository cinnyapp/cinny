import React, { useState } from 'react';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { SequenceCard } from '../../components/sequence-card';
import { useRoom } from '../../hooks/useRoom';
import { UserAvatar } from '../../components/user-avatar';
import { getMouseEventCords } from '../../utils/dom';
import * as css from './styles.css';
import { CallMember } from '../../../client/call';
import { useClient } from '../../hooks/useClient';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';
import { mxcToHttp } from '../../../client/mxcToHttp';

type CallMemberCardProps = {
  member: CallMember;
};
export function CallMemberCard({ member }: CallMemberCardProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const roomId = useRoom();
  const membersAPI = useRoomMembersAPI();

  const openUserProfile = useOpenUserRoomProfile();

  const { userId } = member;
  if (!userId) return null;

  const name = membersAPI.getName(member.userId);
  const avatarMxc = membersAPI.getAvatar(member.userId);
  const avatarUrl = avatarMxc
    ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
        width: 96,
        height: 96,
      })
    : undefined;

  const audioOnly = member.intent === 'audio';

  return (
    <SequenceCard
      as="button"
      key={member.userId}
      className={css.CallMemberCard}
      variant="SurfaceVariant"
      radii="500"
      onClick={(evt: any) =>
        openUserProfile(roomId, undefined, userId, getMouseEventCords(evt.nativeEvent), 'Right')
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

export function CallMemberRenderer({ members, max = 4 }: { members: CallMember[]; max?: number }) {
  const [viewMore, setViewMore] = useState(false);

  const truncatedMembers = viewMore ? members : members.slice(0, 4);
  const remaining = members.length - truncatedMembers.length;

  return (
    <>
      {truncatedMembers.map((member) => (
        <CallMemberCard key={member.userId} member={member} />
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
