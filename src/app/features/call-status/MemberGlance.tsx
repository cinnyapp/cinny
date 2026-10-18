import { Box, config, Icon, Icons, Text } from 'folds';
import React from 'react';
import { UserAvatar } from '../../components/user-avatar';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { StackedAvatar } from '../../components/stacked-avatar';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { getMouseEventCords } from '../../utils/dom';
import * as css from './styles.css';
import { RoomMembersAPI } from '../../hooks/useRoomMembers';
import { useClient } from '../../hooks/useClient';
import { mxcToHttp } from '../../../client/mxcToHttp';

type MemberGlanceProps = {
  roomId: string;
  users: string[];
  membersAPI: RoomMembersAPI;
  speakers: Set<string>;
  max?: number;
};
export function MemberGlance({ roomId, users, membersAPI, speakers, max = 6 }: MemberGlanceProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const openUserProfile = useOpenUserRoomProfile();

  const visibleMembers = users.slice(0, max);
  const remainingCount = max && users.length > max ? users.length - max : 0;

  return (
    <Box alignItems="Center">
      {visibleMembers.map((userId) => {
        if (!userId) return null;
        const name = membersAPI.getName(userId);
        const avatarMxc = membersAPI.getAvatar(userId);
        const avatarUrl = avatarMxc
          ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
              width: 96,
              height: 96,
            })
          : undefined;

        return (
          <StackedAvatar
            key={userId}
            className={speakers.has(userId) ? css.SpeakerAvatarOutline : undefined}
            title={name}
            as="button"
            variant="Background"
            size="200"
            radii="Pill"
            onClick={(evt) =>
              openUserProfile(roomId, undefined, userId, getMouseEventCords(evt.nativeEvent), 'Top')
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
