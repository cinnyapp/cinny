import React, { useMemo, useState } from 'react';
import { Avatar, Box, config, Icon, IconButton, Icons, IconSrc, MenuItem, Text } from 'folds';
import { PageNav, PageNavContent, PageNavHeader, PageRoot } from '../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { General } from './general';
import { Members } from '../common-settings/members';
import { EmojisStickers } from '../common-settings/emojis-stickers';
import { Permissions } from './permissions';
import { RoomSettingsPage } from '../../state/roomSettings';
import { useRoom } from '../../hooks/useRoom';
import { DeveloperTools } from '../common-settings/developer-tools';
import { useClient } from '../../hooks/useClient';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../hooks/storage/useGetRoomAvatar';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { useObservableValue } from '../../hooks/useObservableValue';
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

type RoomSettingsMenuItem = {
  page: RoomSettingsPage;
  name: string;
  icon: IconSrc;
};

const useRoomSettingsMenuItems = (): RoomSettingsMenuItem[] =>
  useMemo(
    () => [
      {
        page: RoomSettingsPage.GeneralPage,
        name: 'General',
        icon: Icons.Setting,
      },
      {
        page: RoomSettingsPage.MembersPage,
        name: 'Members',
        icon: Icons.User,
      },
      {
        page: RoomSettingsPage.PermissionsPage,
        name: 'Permissions',
        icon: Icons.Lock,
      },
      {
        page: RoomSettingsPage.EmojisStickersPage,
        name: 'Emojis & Stickers',
        icon: Icons.Smile,
      },
      {
        page: RoomSettingsPage.DeveloperToolsPage,
        name: 'Developer Tools',
        icon: Icons.Terminal,
      },
    ],
    []
  );

type RoomSettingsProps = {
  initialPage?: RoomSettingsPage;
  requestClose: () => void;
};
export function RoomSettings({ initialPage, requestClose }: RoomSettingsProps) {
  const roomId = useRoom();
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes);

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
  const [activePage, setActivePage] = useState<RoomSettingsPage | undefined>(() => {
    if (initialPage) return initialPage;
    return screenSize === ScreenSize.Mobile ? undefined : RoomSettingsPage.GeneralPage;
  });
  const menuItems = useRoomSettingsMenuItems();

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
                              size="50"
                              roomType={ct.roomToType.read.get(roomId)}
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
            {activePage === RoomSettingsPage.GeneralPage && (
              <General requestClose={handlePageRequestClose} />
            )}
            {activePage === RoomSettingsPage.MembersPage && (
              <Members requestClose={handlePageRequestClose} />
            )}
            {activePage === RoomSettingsPage.PermissionsPage && (
              <Permissions requestClose={handlePageRequestClose} />
            )}
            {activePage === RoomSettingsPage.EmojisStickersPage && (
              <EmojisStickers requestClose={handlePageRequestClose} />
            )}
            {activePage === RoomSettingsPage.DeveloperToolsPage && (
              <DeveloperTools requestClose={handlePageRequestClose} />
            )}
          </PageRoot>
        </PowerLevelTagsContextProvider>
      </PowerLevelsContextProvider>
    </RoomMembersAPIProvider>
  );
}
