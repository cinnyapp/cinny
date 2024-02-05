import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Box, Text } from 'folds';
import { Room } from 'matrix-js-sdk';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import {
  useSpaceChildDirects,
  useSpaceChildRooms,
  useSpaceRecursiveChildSpaces,
} from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { factoryRoomIdByAtoZ } from '../../../utils/sort';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import { NavItem, NavItemContent, NavLink } from '../../../components/nav-item';
import { UnreadBadge, UnreadBadgeCenter } from '../../../components/unread-badge';
import { RoomIcon } from '../../../components/room-avatar';
import { getSpaceRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { RoomUnreadProvider } from '../../../components/RoomUnreadProvider';
import { useSelectedRoom } from '../../../hooks/useSelectedRoom';
import { useSelectedSpace } from '../../../hooks/useSelectedSpace';

export function Space({ space }: { space: Room }) {
  const mx = useMatrixClient();

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);

  const childSpaces = useSpaceRecursiveChildSpaces(mx, space.roomId, allRoomsAtom, roomToParents);
  const childRooms = useSpaceChildRooms(mx, space.roomId, allRoomsAtom, roomToParents);
  const childDirects = useSpaceChildDirects(
    mx,
    space.roomId,
    allRoomsAtom,
    mDirects,
    roomToParents
  );

  const selectedRoomId = useSelectedRoom();

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
          <ClientDrawerContentLayout>
            <Box direction="Column">
              {childRooms.sort(factoryRoomIdByAtoZ(mx)).map((roomId) => {
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
                        <NavLink
                          to={getSpaceRoomPath(
                            getCanonicalAliasOrRoomId(mx, space.roomId),
                            getCanonicalAliasOrRoomId(mx, roomId)
                          )}
                        >
                          <NavItemContent size="T300">
                            <Box as="span" grow="Yes" alignItems="Center" gap="200">
                              <Avatar size="200" radii="400">
                                <RoomIcon
                                  filled={selected}
                                  size="100"
                                  joinRule={room.getJoinRule()}
                                />
                              </Avatar>
                              <Box as="span" grow="Yes">
                                <Text as="span" size="Inherit" truncate>
                                  {room.name}
                                </Text>
                              </Box>
                              {unread && (
                                <UnreadBadgeCenter>
                                  <UnreadBadge
                                    highlight={unread.highlight > 0}
                                    count={unread.total}
                                  />
                                </UnreadBadgeCenter>
                              )}
                            </Box>
                          </NavItemContent>
                        </NavLink>
                      </NavItem>
                    )}
                  </RoomUnreadProvider>
                );
              })}
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
