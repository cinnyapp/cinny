import React, { ReactNode } from 'react';
import { as, Avatar, Box, Icon, Icons, Text } from 'folds';
import { UserAvatar } from '../user-avatar';
import * as css from './style.css';
import { ClientContext } from '../../../client/context';
import { JoinRoomMemberObject } from '../../../client/storage/collections';
import { GetRoomMemberNameCallback, GetRoomMemberAvatarCallback } from '../../hooks/useRoomMembers';
import { useUserPresence } from '../../hooks/useUserPresence';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { getMxIdLocalPart } from '../../utils/matrix';
import { PresenceBadge, AvatarPresence } from '../presence';

type MemberTileProps = {
  ct: ClientContext;
  member: JoinRoomMemberObject;
  getName: GetRoomMemberNameCallback;
  getAvatar: GetRoomMemberAvatarCallback;
  useAuthentication: boolean;
  after?: ReactNode;
};
export const MemberTile = as<'button', MemberTileProps>(
  (
    {
      as: AsMemberTile = 'button',
      ct,
      member,
      getName,
      getAvatar,
      useAuthentication,
      after,
      ...props
    },
    ref
  ) => {
    const presence = useUserPresence(member.userId);
    const username = getMxIdLocalPart(member.userId);

    const name = getName(member.userId);
    const avatarMxcUrl = getAvatar(member.userId);
    const avatarUrl = avatarMxcUrl
      ? mxcToHttp(ct.session.baseUrl, avatarMxcUrl, useAuthentication).thumbnail({
          width: 96,
          height: 96,
          method: 'crop',
        })
      : undefined;

    return (
      <AsMemberTile className={css.MemberTile} {...props} ref={ref}>
        <AvatarPresence
          variant="Surface"
          badge={presence && <PresenceBadge size="300" presence={presence.presence} />}
        >
          <Avatar size="300" radii="400">
            <UserAvatar
              userId={member.userId}
              src={avatarUrl ?? undefined}
              alt={name}
              renderFallback={() => <Icon size="300" src={Icons.User} filled />}
            />
          </Avatar>
        </AvatarPresence>

        <Box grow="Yes" as="span" direction="Column">
          <Text as="span" size="T300" truncate>
            <b>{name}</b>
          </Text>
          <Box alignItems="Center" justifyContent="SpaceBetween" gap="100">
            <Text as="span" size="T200" priority="300" truncate>
              @{username}
            </Text>
          </Box>
        </Box>
        {after}
      </AsMemberTile>
    );
  }
);
