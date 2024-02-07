import React, { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { Room } from 'matrix-js-sdk';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import {
  useSpaceRecursiveChildDirects,
  useSpaceRecursiveChildSpaces,
} from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { factoryRoomIdByAtoZ } from '../../../utils/sort';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import {
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../../components/unread-badge';
import { RoomIcon } from '../../../components/room-avatar';
import { getSpaceRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { RoomUnreadProvider } from '../../../components/RoomUnreadProvider';
import { useSelectedRoom } from '../../../hooks/useSelectedRoom';
import { useSelectedSpace } from '../../../hooks/useSelectedSpace';
import { SpaceChildRoomsProvider } from '../../../components/SpaceChildRoomsProvider';

export function Space({ space }: { space: Room }) {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);

  const childSpaces = useSpaceRecursiveChildSpaces(mx, space.roomId, allRoomsAtom, roomToParents);
  const childDirects = useSpaceRecursiveChildDirects(
    mx,
    space.roomId,
    allRoomsAtom,
    mDirects,
    roomToParents
  );

  const selectedRoomId = useSelectedRoom();

  const getToLink = (roomId: string) =>
    getSpaceRoomPath(
      getCanonicalAliasOrRoomId(mx, space.roomId),
      getCanonicalAliasOrRoomId(mx, roomId)
    );

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
                    <RoomIcon filled={selected} size="100" joinRule={room.getJoinRule()} />
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
                <NavItem variant="Background" radii="400">
                  <NavLink to="TODO:">
                    <NavItemContent size="T300">
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.Flag} size="100" />
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
                <NavItem variant="Background" radii="400">
                  <NavLink to="TODO:">
                    <NavItemContent size="T300">
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon src={Icons.Search} size="100" />
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
              <SpaceChildRoomsProvider spaceId={space.roomId} roomToParents={roomToParents}>
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
                  roomToParents={roomToParents}
                >
                  {(childRooms) =>
                    childRooms.length > 0 && (
                      <NavCategory>
                        <NavCategoryHeader>
                          <Text size="O400">{mx.getRoom(childSpaceId)?.name}</Text>
                        </NavCategoryHeader>
                        {Array.from(childRooms)
                          .sort(factoryRoomIdByAtoZ(mx))
                          .map(renderRoomSelector)}
                      </NavCategory>
                    )
                  }
                </SpaceChildRoomsProvider>
              ))}
              {childDirects.length > 0 && (
                <NavCategory>
                  <NavCategoryHeader>
                    <Text size="O400">People</Text>
                  </NavCategoryHeader>
                  {Array.from(childDirects).sort(factoryRoomIdByAtoZ(mx)).map(renderRoomSelector)}
                </NavCategory>
              )}
            </Box>
          </ClientDrawerContentLayout>
        </ClientDrawerLayout>
      }
    >
      <Outlet />
    </ClientContentLayout>
  );
}

export function SpaceViewer() {
  const mx = useMatrixClient();

  const selectedSpaceId = useSelectedSpace();
  const space = mx.getRoom(selectedSpaceId);

  if (!space) {
    return <p>TODO: join space screen</p>;
  }

  return <Space space={space} />;
}
