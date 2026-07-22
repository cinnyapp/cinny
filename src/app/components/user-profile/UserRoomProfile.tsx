import { Box, Button, config, Icon, Icons, Text } from 'folds';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ObjectReader } from 'neurone/lib/utils';
import { UserHero, UserHeroName } from './UserHero';
import { getMxIdServer } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import {
  PowerLevelsContextProvider,
  usePowerLevels,
  usePowerLevelsState,
} from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useUserPresence } from '../../hooks/useUserPresence';
import { IgnoredUserAlert, MutualRoomsChip, OptionsChip, ServerChip, ShareChip } from './UserChips';
import { useCloseUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { PowerChip } from './PowerChip';
import { UserInviteAlert, UserBanAlert, UserModeration, UserKickAlert } from './UserModeration';
import { useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { Membership } from '../../../types/matrix/room';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMemberPowerCompare } from '../../hooks/useMemberPowerCompare';
import { CreatorChip } from './CreatorChip';
import { getDirectCreatePath, withSearchParam } from '../../pages/pathUtils';
import { DirectCreateSearchParams } from '../../pages/paths';
import { useRoomMember } from '../../hooks/useRoomMember';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { useClient } from '../../hooks/useClient';
import {
  PowerLevelTagsContextProvider,
  usePowerLevelTags,
  usePowerLevelTagsState,
} from '../../hooks/usePowerLevelTags';
import { useUserProfile } from '../../hooks/useUserProfile';

type UserRoomProfileProps = {
  userId: string;
};
export function UserRoomProfile({ userId }: UserRoomProfileProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const navigate = useNavigate();
  const closeUserRoomProfile = useCloseUserRoomProfile();
  const ignoredUsers = useIgnoredUsers();
  const ignored = ignoredUsers.includes(userId);

  const roomId = useRoom();
  const stateObjResult = usePowerLevelsState(roomId);
  const powerLevels = usePowerLevels(stateObjResult.value);
  const creators = useRoomCreators(roomId);
  const powerLevelTagsResult = usePowerLevelTagsState(roomId);
  const powerLevelTags = usePowerLevelTags(powerLevels, powerLevelTagsResult.value);

  const permissions = useRoomPermissions(creators, powerLevels);
  const { hasMorePower } = useMemberPowerCompare(creators, powerLevels);

  const myUserId = ct.session.userId;
  const creator = creators?.has(userId);

  const canKickUser = permissions.action('kick', myUserId) && hasMorePower(myUserId, userId);
  const canBanUser = permissions.action('ban', myUserId) && hasMorePower(myUserId, userId);
  const canUnban = permissions.action('ban', myUserId);
  const canInvite = permissions.action('invite', myUserId);

  const { memberEventResult, getMembership, getName, getAvatar } = useRoomMember(roomId, userId);

  const membership = getMembership();

  const server = getMxIdServer(userId);
  const displayName = getName();
  const avatarMxc = getAvatar();
  const avatarUrl = avatarMxc
    ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).url()
    : undefined;

  const presence = useUserPresence(userId);
  const profile = useUserProfile(userId);

  const bannerUrl = profile?.bannerUrl
    ? mxcToHttp(ct.session.baseUrl, profile.bannerUrl, useAuthentication).url()
    : avatarUrl;

  const handleMessage = () => {
    closeUserRoomProfile();
    const directSearchParam: DirectCreateSearchParams = {
      userId,
    };
    navigate(withSearchParam(getDirectCreatePath(), directSearchParam));
  };

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <PowerLevelTagsContextProvider value={powerLevelTags}>
        <Box direction="Column">
          <UserHero
            userId={userId}
            avatarUrl={avatarUrl}
            bannerUrl={bannerUrl}
            presence={presence && presence.lastActiveTs !== 0 ? presence : undefined}
          />
          <Box direction="Column" gap="500" style={{ padding: config.space.S400 }}>
            <Box direction="Column" gap="400">
              <Box gap="400" alignItems="Start">
                <UserHeroName displayName={displayName} userId={userId} />
                {userId !== myUserId && (
                  <Box shrink="No">
                    <Button
                      size="300"
                      variant="Primary"
                      fill="Solid"
                      radii="300"
                      before={<Icon size="50" src={Icons.Message} filled />}
                      onClick={handleMessage}
                    >
                      <Text size="B300">Message</Text>
                    </Button>
                  </Box>
                )}
              </Box>
              <Box alignItems="Center" gap="200" wrap="Wrap">
                {server && <ServerChip server={server} />}
                <ShareChip userId={userId} />
                {creator ? <CreatorChip /> : <PowerChip userId={userId} />}
                {userId !== myUserId && <MutualRoomsChip userId={userId} />}
                {userId !== myUserId && <OptionsChip userId={userId} />}
              </Box>
            </Box>
            {ignored && <IgnoredUserAlert />}
            {memberEventResult.value && membership === Membership.Ban && (
              <UserBanAlert
                userId={userId}
                reason={ObjectReader.string(memberEventResult.value.event.content, 'reason')}
                canUnban={canUnban}
                bannedBy={memberEventResult.value.event.sender}
                ts={memberEventResult.value.event.origin_server_ts}
              />
            )}
            {memberEventResult.value &&
              membership === Membership.Leave &&
              memberEventResult.value.event.sender !== userId && (
                <UserKickAlert
                  reason={ObjectReader.string(memberEventResult.value.event.content, 'reason')}
                  kickedBy={memberEventResult.value.event.sender}
                  ts={memberEventResult.value.event.origin_server_ts}
                />
              )}
            {memberEventResult.value && membership === Membership.Invite && (
              <UserInviteAlert
                userId={userId}
                reason={ObjectReader.string(memberEventResult.value.event.content, 'reason')}
                canKick={canKickUser}
                invitedBy={memberEventResult.value.event.sender}
                ts={memberEventResult.value.event.origin_server_ts}
              />
            )}
            <UserModeration
              userId={userId}
              canInvite={canInvite && membership === Membership.Leave}
              canKick={canKickUser && membership === Membership.Join}
              canBan={canBanUser && membership !== Membership.Ban}
            />
          </Box>
        </Box>
      </PowerLevelTagsContextProvider>
    </PowerLevelsContextProvider>
  );
}
