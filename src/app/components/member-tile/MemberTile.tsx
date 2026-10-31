import React, { ReactNode } from 'react';
import { as, Avatar, Box, Text } from 'folds';
import { MatrixClient, Room, RoomMember } from 'matrix-js-sdk';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { UserAvatar, UserInitials } from '../user-avatar';
import { getSenderAvatar } from '../../hooks/useSenderAvatar';
import * as css from './style.css';

const getName = (room: Room, member: RoomMember) =>
  getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

type MemberTileProps = {
  mx: MatrixClient;
  room: Room;
  member: RoomMember;
  useAuthentication: boolean;
  after?: ReactNode;
};
export const MemberTile = as<'button', MemberTileProps>(
  ({ as: AsMemberTile = 'button', mx, room, member, useAuthentication, after, ...props }, ref) => {
    const name = getName(room, member);
    const username = getMxIdLocalPart(member.userId);

    const avatar = getSenderAvatar(mx, room, member.userId, useAuthentication, 100);

    return (
      <AsMemberTile className={css.MemberTile} {...props} ref={ref}>
        <Avatar size="300" radii="400">
          <UserAvatar
            userId={member.userId}
            src={avatar.src}
            fallbackSrc={avatar.fallbackSrc}
            alt={name}
            renderFallback={() => <UserInitials name={name} size="T300" />}
          />
        </Avatar>
        <Box grow="Yes" as="span" direction="Column">
          <Text as="span" size="T300" truncate>
            <b>{name}</b>
          </Text>
          <Box alignItems="Center" justifyContent="SpaceBetween" gap="100">
            <Text as="span" size="T200" priority="300" truncate>
              {username}
            </Text>
          </Box>
        </Box>
        {after}
      </AsMemberTile>
    );
  }
);
