import React, { useMemo, useState } from 'react';
import { Avatar, Box, config, Icon, IconButton, Icons, IconSrc, MenuItem, Text } from 'folds';
import { PageNav, PageNavContent, PageNavHeader, PageRoot } from '../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { SpaceSettingsPage } from '../../state/spaceSettings';
import { useRoom } from '../../hooks/useRoom';
import { EmojisStickers } from '../common-settings/emojis-stickers';
import { Members } from '../common-settings/members';
import { DeveloperTools } from '../common-settings/developer-tools';
import { General } from './general';
import { Permissions } from './permissions';
import { useClient } from '../../hooks/useClient';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../hooks/storage/useGetRoomAvatar';
import {
  PowerLevelsContextProvider,
  usePowerLevels,
  usePowerLevelsState,
} from '../../hooks/usePowerLevels';
import {
  PowerLevelTagsContextProvider,
  usePowerLevelTags,
  usePowerLevelTagsState,
} from '../../hooks/usePowerLevelTags';
import { RoomMembersAPIProvider, useCreateRoomMembersAPI } from '../../hooks/useRoomMembers';
import { usePendingMemberLoader, usePendingMembers } from '../../hooks/usePendingMembers';
import { useObservableValue } from '../../hooks/useObservableValue';
import { mxcToHttp } from '../../../client/mxcToHttp';

type SpaceSettingsMenuItem = {
  page: SpaceSettingsPage;
  name: string;
  icon: IconSrc;
};

const useSpaceSettingsMenuItems = (): SpaceSettingsMenuItem[] =>
  useMemo(
    () => [
      {
        page: SpaceSettingsPage.GeneralPage,
        name: 'General',
        icon: Icons.Setting,
      },
      {
        page: SpaceSettingsPage.MembersPage,
        name: 'Members',
        icon: Icons.User,
      },
      {
        page: SpaceSettingsPage.PermissionsPage,
        name: 'Permissions',
        icon: Icons.Lock,
      },
      {
        page: SpaceSettingsPage.EmojisStickersPage,
        name: 'Emojis & Stickers',
        icon: Icons.Smile,
      },
      {
        page: SpaceSettingsPage.DeveloperToolsPage,
        name: 'Developer Tools',
        icon: Icons.Terminal,
      },
    ],
    []
  );

type SpaceSettingsProps = {
  initialPage?: SpaceSettingsPage;
  requestClose: () => void;
};
export function SpaceSettings({ initialPage, requestClose }: SpaceSettingsProps) {
  const ct = useClient();
  const roomId = useRoom();
  const useAuthentication = useMediaAuthentication();

  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(roomId);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes, roomToHeroMembersResult.value);
  const roomAvatar = getRoomAvatar(roomId);
  const roomName = getRoomName(roomId);

  const stateObjResult = usePowerLevelsState(roomId);
  const powerLevels = usePowerLevels(stateObjResult.value);
  const powerLevelTagsResult = usePowerLevelTagsState(roomId);
  const powerLevelTags = usePowerLevelTags(powerLevels, powerLevelTagsResult.value);

  const membersAPI = useCreateRoomMembersAPI(roomId);
  const membersPending = usePendingMembers(roomId);
  usePendingMemberLoader(roomId, membersPending);

  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);

  const avatarUrl = roomAvatar
    ? mxcToHttp(ct.session.baseUrl, roomAvatar, useAuthentication).thumbnail({
        width: 96,
        height: 96,
        method: 'crop',
      })
    : undefined;

  const screenSize = useScreenSizeContext();
  const [activePage, setActivePage] = useState<SpaceSettingsPage | undefined>(() => {
    if (initialPage) return initialPage;
    return screenSize === ScreenSize.Mobile ? undefined : SpaceSettingsPage.GeneralPage;
  });
  const menuItems = useSpaceSettingsMenuItems();

  const handlePageRequestClose = () => {
    if (screenSize === ScreenSize.Mobile) {
      setActivePage(undefined);
      return;
    }
    requestClose();
  };

  return (
    <RoomMembersAPIProvider value={membersAPI}>
      <PowerLevelsContextProvider value={powerLevels}>
        <PowerLevelTagsContextProvider value={powerLevelTags}>
          <PageRoot
            nav={
              screenSize === ScreenSize.Mobile && activePage !== undefined ? undefined : (
                <PageNav size="300">
                  <PageNavHeader outlined={false}>
                    <Box grow="Yes" gap="200">
                      <Avatar size="200" radii="300">
                        <RoomAvatar
                          roomId={roomId}
                          src={avatarUrl}
                          alt={roomName}
                          renderFallback={() => (
                            <RoomIcon
                              roomType={ct.roomToType.read.get(roomId)}
                              size="50"
                              joinRule={roomToJoinRule.get(roomId)}
                              filled
                            />
                          )}
                        />
                      </Avatar>
                      <Text size="H4" truncate>
                        {roomName}
                      </Text>
                    </Box>
                    <Box shrink="No">
                      {screenSize === ScreenSize.Mobile && (
                        <IconButton onClick={requestClose} variant="Background">
                          <Icon src={Icons.Cross} />
                        </IconButton>
                      )}
                    </Box>
                  </PageNavHeader>
                  <Box grow="Yes" direction="Column">
                    <PageNavContent>
                      <div style={{ flexGrow: 1 }}>
                        {menuItems.map((item) => (
                          <MenuItem
                            key={item.name}
                            variant="Background"
                            radii="400"
                            aria-pressed={activePage === item.page}
                            before={
                              <Icon src={item.icon} size="100" filled={activePage === item.page} />
                            }
                            onClick={() => setActivePage(item.page)}
                          >
                            <Text
                              style={{
                                fontWeight:
                                  activePage === item.page ? config.fontWeight.W600 : undefined,
                              }}
                              size="T300"
                              truncate
                            >
                              {item.name}
                            </Text>
                          </MenuItem>
                        ))}
                      </div>
                    </PageNavContent>
                  </Box>
                </PageNav>
              )
            }
          >
            {activePage === SpaceSettingsPage.GeneralPage && (
              <General requestClose={handlePageRequestClose} />
            )}
            {activePage === SpaceSettingsPage.MembersPage && (
              <Members requestClose={handlePageRequestClose} />
            )}
            {activePage === SpaceSettingsPage.PermissionsPage && (
              <Permissions requestClose={handlePageRequestClose} />
            )}
            {activePage === SpaceSettingsPage.EmojisStickersPage && (
              <EmojisStickers requestClose={handlePageRequestClose} />
            )}
            {activePage === SpaceSettingsPage.DeveloperToolsPage && (
              <DeveloperTools requestClose={handlePageRequestClose} />
            )}
          </PageRoot>
        </PowerLevelTagsContextProvider>
      </PowerLevelsContextProvider>
    </RoomMembersAPIProvider>
  );
}
