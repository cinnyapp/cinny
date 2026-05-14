import React, { MouseEventHandler, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { Room } from 'matrix-js-sdk';
import {
  PopOut,
  Menu,
  MenuItem,
  config,
  Text,
  Line,
  Chip,
  Icon,
  Icons,
  RectCords,
  Spinner,
  toRem,
  Box,
  Scroll,
  Avatar,
} from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdServer } from '../../utils/matrix';
import { useCloseUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { stopPropagation } from '../../utils/keyboard';
import { copyToClipboard } from '../../utils/dom';
import { getExploreServerPath } from '../../pages/pathUtils';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { factoryRoomIdByAtoZ } from '../../utils/sort';
import { useMutualRooms, useMutualRoomsSupport } from '../../hooks/useMutualRooms';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useDirectRooms } from '../../pages/client/direct/useDirectRooms';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useAllJoinedRoomsSet, useGetRoom } from '../../hooks/useGetRoom';
import { RoomAvatar, RoomIcon } from '../room-avatar';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../utils/room';
import { nameInitials } from '../../utils/common';
import { getMatrixToUser } from '../../plugins/matrix-to';
import { useTimeoutToggle } from '../../hooks/useTimeoutToggle';
import { useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { CutoutCard } from '../cutout-card';
import { SettingTile } from '../setting-tile';

export function ServerChip({ server }: { server: string }) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const myServer = getMxIdServer(mx.getSafeUserId());
  const navigate = useNavigate();
  const closeProfile = useCloseUserRoomProfile();
  const [copied, setCopied] = useTimeoutToggle();

  const [cords, setCords] = useState<RectCords>();

  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const close = () => setCords(undefined);

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Start"
      offset={4}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
          }}
        >
          <Menu>
            <div style={{ padding: config.space.S100 }}>
              <MenuItem
                variant="Surface"
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  copyToClipboard(server);
                  setCopied();
                  close();
                }}
              >
                <Text size="B300">{t('userProfile.copyServer')}</Text>
              </MenuItem>
              <MenuItem
                variant="Surface"
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  navigate(getExploreServerPath(server));
                  closeProfile();
                }}
              >
                <Text size="B300">{t('userProfile.exploreCommunity')}</Text>
              </MenuItem>
            </div>
            <Line size="300" />
            <div style={{ padding: config.space.S100 }}>
              <MenuItem
                variant={myServer === server ? 'Surface' : 'Critical'}
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  window.open(`https://${server}`, '_blank');
                  close();
                }}
              >
                <Text size="B300">{t('userProfile.openInBrowser')}</Text>
              </MenuItem>
            </div>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        variant={myServer === server ? 'SurfaceVariant' : 'Warning'}
        radii="Pill"
        before={
          cords ? (
            <Icon size="50" src={Icons.ChevronBottom} />
          ) : (
            <Icon size="50" src={copied ? Icons.Check : Icons.Server} />
          )
        }
        onClick={open}
        aria-pressed={!!cords}
      >
        <Text size="B300" truncate>
          {server}
        </Text>
      </Chip>
    </PopOut>
  );
}

export function ShareChip({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [cords, setCords] = useState<RectCords>();

  const [copied, setCopied] = useTimeoutToggle();

  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const close = () => setCords(undefined);

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Start"
      offset={4}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
          }}
        >
          <Menu>
            <div style={{ padding: config.space.S100 }}>
              <MenuItem
                variant="Surface"
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  copyToClipboard(userId);
                  setCopied();
                  close();
                }}
              >
                <Text size="B300">{t('userProfile.copyUserId')}</Text>
              </MenuItem>
              <MenuItem
                variant="Surface"
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  copyToClipboard(getMatrixToUser(userId));
                  setCopied();
                  close();
                }}
              >
                <Text size="B300">{t('userProfile.copyUserLink')}</Text>
              </MenuItem>
            </div>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        variant={copied ? 'Success' : 'SurfaceVariant'}
        radii="Pill"
        before={
          cords ? (
            <Icon size="50" src={Icons.ChevronBottom} />
          ) : (
            <Icon size="50" src={copied ? Icons.Check : Icons.Link} />
          )
        }
        onClick={open}
        aria-pressed={!!cords}
      >
        <Text size="B300" truncate>
          {t('userProfile.share')}
        </Text>
      </Chip>
    </PopOut>
  );
}

type MutualRoomsData = {
  rooms: Room[];
  spaces: Room[];
  directs: Room[];
};

export function MutualRoomsChip({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const mutualRoomSupported = useMutualRoomsSupport();
  const mutualRoomsState = useMutualRooms(userId);
  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const closeUserRoomProfile = useCloseUserRoomProfile();
  const directs = useDirectRooms();
  const useAuthentication = useMediaAuthentication();

  const allJoinedRooms = useAllJoinedRoomsSet();
  const getRoom = useGetRoom(allJoinedRooms);

  const [cords, setCords] = useState<RectCords>();

  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const close = () => setCords(undefined);

  const mutual: MutualRoomsData = useMemo(() => {
    const data: MutualRoomsData = {
      rooms: [],
      spaces: [],
      directs: [],
    };

    if (mutualRoomsState.status === AsyncStatus.Success) {
      const mutualRooms = mutualRoomsState.data
        .sort(factoryRoomIdByAtoZ(mx))
        .map(getRoom)
        .filter((room) => !!room);
      mutualRooms.forEach((room) => {
        if (room.isSpaceRoom()) {
          data.spaces.push(room);
          return;
        }
        if (directs.includes(room.roomId)) {
          data.directs.push(room);
          return;
        }
        data.rooms.push(room);
      });
    }
    return data;
  }, [mutualRoomsState, getRoom, directs, mx]);

  if (
    userId === mx.getSafeUserId() ||
    !mutualRoomSupported ||
    mutualRoomsState.status === AsyncStatus.Error
  ) {
    return null;
  }

  const renderItem = (room: Room) => {
    const { roomId } = room;
    const dm = directs.includes(roomId);

    return (
      <MenuItem
        key={roomId}
        variant="Surface"
        fill="None"
        size="300"
        radii="300"
        style={{ paddingLeft: config.space.S100 }}
        onClick={() => {
          if (room.isSpaceRoom()) {
            navigateSpace(roomId);
          } else {
            navigateRoom(roomId);
          }
          closeUserRoomProfile();
        }}
        before={
          <Avatar size="200" radii={dm ? '400' : '300'}>
            {dm || room.isSpaceRoom() ? (
              <RoomAvatar
                roomId={room.roomId}
                src={
                  dm
                    ? getDirectRoomAvatarUrl(mx, room, 96, useAuthentication)
                    : getRoomAvatarUrl(mx, room, 96, useAuthentication)
                }
                alt={room.name}
                renderFallback={() => (
                  <Text as="span" size="H6">
                    {nameInitials(room.name)}
                  </Text>
                )}
              />
            ) : (
              <RoomIcon size="100" joinRule={room.getJoinRule()} roomType={room.getType()} />
            )}
          </Avatar>
        }
      >
        <Text size="B300" truncate>
          {room.name}
        </Text>
      </MenuItem>
    );
  };

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Start"
      offset={4}
      content={
        mutualRoomsState.status === AsyncStatus.Success ? (
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: close,
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
              isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
              isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
            }}
          >
            <Menu
              style={{
                display: 'flex',
                maxWidth: toRem(200),
                maxHeight: '80vh',
              }}
            >
              <Box grow="Yes">
                <Scroll size="300" hideTrack>
                  <Box
                    direction="Column"
                    gap="400"
                    style={{ padding: config.space.S200, paddingRight: 0 }}
                  >
                    {mutual.spaces.length > 0 && (
                      <Box direction="Column" gap="100">
                        <Text style={{ paddingLeft: config.space.S100 }} size="L400">
                          {t('common.spaces')}
                        </Text>
                        {mutual.spaces.map(renderItem)}
                      </Box>
                    )}
                    {mutual.rooms.length > 0 && (
                      <Box direction="Column" gap="100">
                        <Text style={{ paddingLeft: config.space.S100 }} size="L400">
                          {t('common.rooms')}
                        </Text>
                        {mutual.rooms.map(renderItem)}
                      </Box>
                    )}
                    {mutual.directs.length > 0 && (
                      <Box direction="Column" gap="100">
                        <Text style={{ paddingLeft: config.space.S100 }} size="L400">
                          {t('direct.title')}
                        </Text>
                        {mutual.directs.map(renderItem)}
                      </Box>
                    )}
                  </Box>
                </Scroll>
              </Box>
            </Menu>
          </FocusTrap>
        ) : null
      }
    >
      <Chip
        variant="SurfaceVariant"
        radii="Pill"
        before={mutualRoomsState.status === AsyncStatus.Loading && <Spinner size="50" />}
        disabled={
          mutualRoomsState.status !== AsyncStatus.Success || mutualRoomsState.data.length === 0
        }
        onClick={open}
        aria-pressed={!!cords}
      >
        <Text size="B300">
          {mutualRoomsState.status === AsyncStatus.Success &&
            t('userProfile.mutualRoomsCount', { count: mutualRoomsState.data.length })}
          {mutualRoomsState.status === AsyncStatus.Loading && t('userProfile.mutualRooms')}
        </Text>
      </Chip>
    </PopOut>
  );
}

export function IgnoredUserAlert() {
  const { t } = useTranslation();
  return (
    <CutoutCard style={{ padding: config.space.S200 }} variant="Critical">
      <SettingTile>
        <Box direction="Column" gap="200">
          <Box gap="200" justifyContent="SpaceBetween">
            <Text size="L400">{t('userProfile.blockedUser')}</Text>
          </Box>
          <Box direction="Column">
            <Text size="T200">{t('userProfile.blockedUserDesc')}</Text>
          </Box>
        </Box>
      </SettingTile>
    </CutoutCard>
  );
}

export function OptionsChip({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const [cords, setCords] = useState<RectCords>();

  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const close = () => setCords(undefined);

  const ignoredUsers = useIgnoredUsers();
  const ignored = ignoredUsers.includes(userId);

  const [ignoreState, toggleIgnore] = useAsyncCallback(
    useCallback(async () => {
      const users = ignoredUsers.filter((u) => u !== userId);
      if (!ignored) users.push(userId);
      await mx.setIgnoredUsers(users);
    }, [mx, ignoredUsers, userId, ignored])
  );
  const ignoring = ignoreState.status === AsyncStatus.Loading;

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Start"
      offset={4}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
          }}
        >
          <Menu>
            <div style={{ padding: config.space.S100 }}>
              <MenuItem
                variant="Critical"
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  toggleIgnore();
                  close();
                }}
                before={
                  ignoring ? (
                    <Spinner variant="Critical" size="50" />
                  ) : (
                    <Icon size="50" src={Icons.Prohibited} />
                  )
                }
                disabled={ignoring}
              >
                <Text size="B300">
                  {ignored ? t('userProfile.unblockUser') : t('userProfile.blockUser')}
                </Text>
              </MenuItem>
            </div>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip variant="SurfaceVariant" radii="Pill" onClick={open} aria-pressed={!!cords}>
        {ignoring ? (
          <Spinner variant="Secondary" size="50" />
        ) : (
          <Icon size="50" src={Icons.HorizontalDots} />
        )}
      </Chip>
    </PopOut>
  );
}
