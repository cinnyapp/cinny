import React, { MouseEventHandler, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
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
import { getMxIdServer } from '../../utils/matrix';
import { useCloseUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { stopPropagation } from '../../utils/keyboard';
import { copyToClipboard } from '../../utils/dom';
import { getExploreServerPath } from '../../pages/pathUtils';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { factoryRoomIdByAtoZ } from '../../utils/sort';
import { useMutualRooms } from '../../hooks/useMutualRooms';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useDirectRooms } from '../../pages/client/direct/useDirectRooms';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { RoomAvatar, RoomIcon } from '../room-avatar';
import { nameInitials } from '../../utils/common';
import { getMatrixToUser } from '../../plugins/matrix-to';
import { useTimeoutToggle } from '../../hooks/useTimeoutToggle';
import { CutoutCard } from '../cutout-card';
import { SettingTile } from '../setting-tile';
import { useClient } from '../../hooks/useClient';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../hooks/storage/useGetRoomAvatar';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { useSetting } from '../../state/hooks/settings';

export function ServerChip({ server }: { server: string }) {
  const ct = useClient();
  const myServer = getMxIdServer(ct.session.userId);
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
                <Text size="B300">Copy Server</Text>
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
                <Text size="B300">Explore Community</Text>
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
                <Text size="B300">Open in Browser</Text>
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
                <Text size="B300">Copy User ID</Text>
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
                <Text size="B300">Copy User Link</Text>
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
          Share
        </Text>
      </Chip>
    </PopOut>
  );
}

type MutualRoomsData = {
  rooms: string[];
  spaces: string[];
  directs: string[];
};

export function MutualRoomsChip({ userId }: { userId: string }) {
  const ct = useClient();
  const mutualRoomsState = useMutualRooms(userId);
  const [showAvatar] = useSetting('roomListShowAvatar');

  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const closeUserRoomProfile = useCloseUserRoomProfile();
  const directs = useDirectRooms();
  const useAuthentication = useMediaAuthentication();

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes);

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
      const mutualRooms = mutualRoomsState.data.sort(factoryRoomIdByAtoZ(getRoomName));

      mutualRooms.forEach((roomId) => {
        if (ct.spaceRooms.read.has(roomId)) {
          data.spaces.push(roomId);
          return;
        }
        if (directs.includes(roomId)) {
          data.directs.push(roomId);
          return;
        }
        data.rooms.push(roomId);
      });
    }
    return data;
  }, [mutualRoomsState, getRoomName, directs, ct]);

  if (userId === ct.session.userId || mutualRoomsState.status === AsyncStatus.Error) {
    return null;
  }

  const renderItem = (roomId: string) => {
    const dm = directs.includes(roomId);
    const space = ct.spaceRooms.read.has(roomId);

    const avatarUrl = getRoomAvatar(roomId);
    const roomName = getRoomName(roomId) ?? 'Unknown';

    return (
      <MenuItem
        key={roomId}
        variant="Surface"
        fill="None"
        size="300"
        radii="300"
        style={{ paddingLeft: config.space.S100 }}
        onClick={() => {
          if (space) {
            navigateSpace(roomId);
          } else {
            navigateRoom(roomId);
          }
          closeUserRoomProfile();
        }}
        before={
          <Avatar size="200" radii={space ? '300' : '400'}>
            {showAvatar || dm || space ? (
              <RoomAvatar
                roomId={roomId}
                src={
                  avatarUrl
                    ? mxcToHttp(ct.session.baseUrl, avatarUrl, useAuthentication).thumbnail({
                        width: 96,
                        height: 96,
                        method: 'crop',
                      })
                    : undefined
                }
                alt={roomName}
                renderFallback={() => (
                  <Text as="span" size="H6">
                    {nameInitials(roomName)}
                  </Text>
                )}
              />
            ) : (
              <RoomIcon
                size="100"
                joinRule={ct.roomToJoinRule.read.get(roomId)}
                roomType={ct.roomToType.read.get(roomId)}
              />
            )}
          </Avatar>
        }
      >
        <Text size="B300" truncate>
          {roomName}
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
                          Spaces
                        </Text>
                        {mutual.spaces.map(renderItem)}
                      </Box>
                    )}
                    {mutual.rooms.length > 0 && (
                      <Box direction="Column" gap="100">
                        <Text style={{ paddingLeft: config.space.S100 }} size="L400">
                          Rooms
                        </Text>
                        {mutual.rooms.map(renderItem)}
                      </Box>
                    )}
                    {mutual.directs.length > 0 && (
                      <Box direction="Column" gap="100">
                        <Text style={{ paddingLeft: config.space.S100 }} size="L400">
                          Direct Messages
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
            `${mutualRoomsState.data.length} Mutual Rooms`}
          {mutualRoomsState.status === AsyncStatus.Loading && 'Mutual Rooms'}
        </Text>
      </Chip>
    </PopOut>
  );
}

export function IgnoredUserAlert() {
  return (
    <CutoutCard style={{ padding: config.space.S200 }} variant="Critical">
      <SettingTile>
        <Box direction="Column" gap="200">
          <Box gap="200" justifyContent="SpaceBetween">
            <Text size="L400">Blocked User</Text>
          </Box>
          <Box direction="Column">
            <Text size="T200">You do not receive any messages or invites from this user.</Text>
          </Box>
        </Box>
      </SettingTile>
    </CutoutCard>
  );
}
