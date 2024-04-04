import React, { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { useSpaceChildSpacesRecursive } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { factoryRoomIdByActivity, factoryRoomIdByAtoZ } from '../../../utils/sort';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import {
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../../components/unread-badge';
import { RoomAvatar, RoomIcon } from '../../../components/room-avatar';
import { getSpaceLobbyPath, getSpaceRoomPath, getSpaceSearchPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { RoomUnreadProvider } from '../../../components/RoomUnreadProvider';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useSpaceLobbySelected,
  useSpaceSearchSelected,
} from '../../../hooks/router/useSelectedSpace';
import { SpaceChildRoomsProvider } from '../../../components/SpaceChildRoomsProvider';
import { getRoomAvatarUrl } from '../../../utils/room';
import { nameInitials } from '../../../utils/common';
import { SpaceChildDirectsProvider } from '../../../components/SpaceChildDirectsProvider';
import { useSpace } from '../../../hooks/useSpace';

export function Space() {
  const mx = useMatrixClient();
  const space = useSpace();
  const spaceIdOrAlias = getCanonicalAliasOrRoomId(mx, space.roomId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);

  const childSpaces = useSpaceChildSpacesRecursive(mx, space.roomId, allRoomsAtom, roomToParents);

  const selectedRoomId = useSelectedRoom();
  const lobbySelected = useSpaceLobbySelected(spaceIdOrAlias);
  const searchSelected = useSpaceSearchSelected(spaceIdOrAlias);

  const getToLink = (roomId: string) =>
    getSpaceRoomPath(spaceIdOrAlias, getCanonicalAliasOrRoomId(mx, roomId));

  const renderRoomSelector = (roomId: string) => {
    const room = mx.getRoom(roomId);
    if (!room) return null;
    const selected = selectedRoomId === roomId;

    return (
      <RoomUnreadProvider key={roomId} roomId={roomId}>
        {(unread) => (
          <NavItem
            key={roomId}
            variant="Background"
            radii="400"
            highlight={!!unread || selected}
            aria-selected={selected}
          >
            <NavLink to={getToLink(roomId)}>
              <NavItemContent size="T300">
                <Box as="span" grow="Yes" alignItems="Center" gap="200">
                  <Avatar size="200" radii="400">
                    {mDirects.has(roomId) ? (
                      <RoomAvatar
                        variant="Background"
                        src={getRoomAvatarUrl(mx, room, 96)}
                        alt={room.name}
                        renderInitials={() => <Text size="H6">{nameInitials(room.name)}</Text>}
                      />
                    ) : (
                      <RoomIcon filled={selected} size="100" joinRule={room.getJoinRule()} />
                    )}
                  </Avatar>
                  <Box as="span" grow="Yes">
                    <Text as="span" size="Inherit" truncate>
                      {room.name}
                    </Text>
                  </Box>
                  {unread && (
                    <UnreadBadgeCenter>
                      <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
                    </UnreadBadgeCenter>
                  )}
                </Box>
              </NavItemContent>
            </NavLink>
          </NavItem>
        )}
      </RoomUnreadProvider>
    );
  };

  return (
    <ClientContentLayout
      navigation={
        <ClientDrawerLayout>
          <ClientDrawerHeaderLayout>
            <Box grow="Yes" gap="300">
              <Box grow="Yes">
                <Text size="H4" truncate>
                  {space.name}
                </Text>
              </Box>
            </Box>
          </ClientDrawerHeaderLayout>
          <ClientDrawerContentLayout scrollRef={scrollRef}>
            <Box direction="Column" gap="300">
              <NavCategory>
                <NavItem variant="Background" radii="400" aria-selected={lobbySelected}>
                  <NavLink to={getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, space.roomId))}>
                    <NavItemContent size="T300">
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.Flag} size="100" filled={lobbySelected} />
                        </Avatar>
                        <Box as="span" grow="Yes">
                          <Text as="span" size="Inherit" truncate>
                            Lobby
                          </Text>
                        </Box>
                      </Box>
                    </NavItemContent>
                  </NavLink>
                </NavItem>
                <NavItem variant="Background" radii="400" aria-selected={searchSelected}>
                  <NavLink to={getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))}>
                    <NavItemContent size="T300">
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.Search} size="100" filled={searchSelected} />
                        </Avatar>
                        <Box as="span" grow="Yes">
                          <Text as="span" size="Inherit" truncate>
                            Message Search
                          </Text>
                        </Box>
                      </Box>
                    </NavItemContent>
                  </NavLink>
                </NavItem>
              </NavCategory>
              <SpaceChildRoomsProvider
                spaceId={space.roomId}
                mDirects={mDirects}
                roomToParents={roomToParents}
              >
                {(childRooms) =>
                  childRooms.length > 0 && (
                    <NavCategory>
                      <NavCategoryHeader>
                        <Text size="O400">Rooms</Text>
                      </NavCategoryHeader>
                      {Array.from(childRooms).sort(factoryRoomIdByAtoZ(mx)).map(renderRoomSelector)}
                    </NavCategory>
                  )
                }
              </SpaceChildRoomsProvider>
              {childSpaces.sort(factoryRoomIdByAtoZ(mx)).map((childSpaceId) => (
                <SpaceChildRoomsProvider
                  key={childSpaceId}
                  spaceId={childSpaceId}
                  mDirects={mDirects}
                  roomToParents={roomToParents}
                >
                  {(childRooms) => (
                    <SpaceChildDirectsProvider
                      spaceId={childSpaceId}
                      mDirects={mDirects}
                      roomToParents={roomToParents}
                    >
                      {(childDirects) =>
                        (childRooms.length > 0 || childDirects.length > 0) && (
                          <NavCategory>
                            <NavCategoryHeader>
                              <Text size="O400">{mx.getRoom(childSpaceId)?.name}</Text>
                            </NavCategoryHeader>
                            {Array.from(childRooms)
                              .sort(factoryRoomIdByAtoZ(mx))
                              .map(renderRoomSelector)}
                            {Array.from(childDirects)
                              .sort(factoryRoomIdByActivity(mx))
                              .map(renderRoomSelector)}
                          </NavCategory>
                        )
                      }
                    </SpaceChildDirectsProvider>
                  )}
                </SpaceChildRoomsProvider>
              ))}
              <SpaceChildDirectsProvider
                spaceId={space.roomId}
                mDirects={mDirects}
                roomToParents={roomToParents}
              >
                {(childDirects) =>
                  childDirects.length > 0 && (
                    <NavCategory>
                      <NavCategoryHeader>
                        <Text size="O400">People</Text>
                      </NavCategoryHeader>
                      {Array.from(childDirects)
                        .sort(factoryRoomIdByActivity(mx))
                        .map(renderRoomSelector)}
                    </NavCategory>
                  )
                }
              </SpaceChildDirectsProvider>
            </Box>
          </ClientDrawerContentLayout>
        </ClientDrawerLayout>
      }
    >
      <Outlet />
    </ClientContentLayout>
  );
}
