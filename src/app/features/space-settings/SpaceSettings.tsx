import React, { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Avatar, Box, config, Icon, IconButton, Icons, IconSrc, MenuItem, Text } from 'folds';
import { JoinRule } from 'matrix-js-sdk';
import { PageNav, PageNavContent, PageNavHeader, PageRoot } from '../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { mxcUrlToHttp } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useRoomAvatar, useRoomJoinRule, useRoomName } from '../../hooks/useRoomMeta';
import { mDirectAtom } from '../../state/mDirectList';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { SpaceSettingsPage } from '../../state/spaceSettings';
import { useRoom } from '../../hooks/useRoom';
import { EmojisStickers } from '../common-settings/emojis-stickers';
import { Members } from '../common-settings/members';
import { DeveloperTools } from '../common-settings/developer-tools';
import { General } from './general';
import { Permissions } from './permissions';

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
  const room = useRoom();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const mDirects = useAtomValue(mDirectAtom);

  const roomAvatar = useRoomAvatar(room, mDirects.has(room.roomId));
  const roomName = useRoomName(room);
  const joinRuleContent = useRoomJoinRule(room);

  const avatarUrl = roomAvatar
    ? mxcUrlToHttp(mx, roomAvatar, useAuthentication, 96, 96, 'crop') ?? undefined
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
    <PageRoot
      nav={
        screenSize === ScreenSize.Mobile && activePage !== undefined ? undefined : (
          <PageNav size="300">
            <PageNavHeader outlined={false}>
              <Box grow="Yes" gap="200">
                <Avatar size="200" radii="300">
                  <RoomAvatar
                    roomId={room.roomId}
                    src={avatarUrl}
                    alt={roomName}
                    renderFallback={() => (
                      <RoomIcon
                        roomType={room.getType()}
                        size="50"
                        joinRule={joinRuleContent?.join_rule ?? JoinRule.Invite}
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
                      before={<Icon src={item.icon} size="100" filled={activePage === item.page} />}
                      onClick={() => setActivePage(item.page)}
                    >
                      <Text
                        style={{
                          fontWeight: activePage === item.page ? config.fontWeight.W600 : undefined,
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
  );
}
