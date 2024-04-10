import React, { useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Box, Icon, Icons, Text, config } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import {
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { getSpaceLobbyPath, getSpaceRoomPath, getSpaceSearchPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useSpaceLobbySelected,
  useSpaceSearchSelected,
} from '../../../hooks/router/useSelectedSpace';
import { useSpace } from '../../../hooks/useSpace';
import { VirtualTile } from '../../../components/virtualizer';
import { useSpaceHierarchy } from './useSpaceHierarchy';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { closedNavCategoriesAtom, makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useNavCategoryHandler } from '../../../hooks/useNavCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/navToActivePathMapper';

export function Space() {
  const mx = useMatrixClient();
  const space = useSpace();
  useNavToActivePathMapper(space.roomId);
  const spaceIdOrAlias = getCanonicalAliasOrRoomId(mx, space.roomId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mDirects = useAtomValue(mDirectAtom);
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const muteChanges = useAtomValue(muteChangesAtom);
  const mutedRooms = muteChanges.added;

  const selectedRoomId = useSelectedRoom();
  const lobbySelected = useSpaceLobbySelected(spaceIdOrAlias);
  const searchSelected = useSpaceSearchSelected(spaceIdOrAlias);

  const closedCategories = useAtomValue(closedNavCategoriesAtom);
  const hierarchy = useSpaceHierarchy(
    space.roomId,
    useCallback(
      (spaceRoomId, directCategory) => {
        if (directCategory) {
          return closedCategories.has(makeNavCategoryId(space.roomId, spaceRoomId, 'direct'));
        }
        return closedCategories.has(makeNavCategoryId(space.roomId, spaceRoomId));
      },
      [space.roomId, closedCategories]
    ),
    useCallback(
      (roomId) => roomToUnread.has(roomId) || roomId === selectedRoomId,
      [roomToUnread, selectedRoomId]
    )
  );

  const virtualizer = useVirtualizer({
    count: hierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 0,
    overscan: 10,
  });

  const handleCategoryClick = useNavCategoryHandler((categoryId) =>
    closedCategories.has(categoryId)
  );

  const getToLink = (roomId: string) =>
    getSpaceRoomPath(spaceIdOrAlias, getCanonicalAliasOrRoomId(mx, roomId));

  let lastSpaceId = '';
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
              <NavCategory
                style={{
                  height: virtualizer.getTotalSize(),
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const roomId = hierarchy[vItem.index];
                  const room = mx.getRoom(roomId);
                  if (!room) return null;

                  if (room.isSpaceRoom()) {
                    const dmCategory = lastSpaceId === roomId;
                    lastSpaceId = roomId;
                    const categoryId = dmCategory
                      ? makeNavCategoryId(space.roomId, roomId, 'direct')
                      : makeNavCategoryId(space.roomId, roomId);

                    return (
                      <VirtualTile
                        virtualItem={vItem}
                        key={vItem.index}
                        ref={virtualizer.measureElement}
                      >
                        <div
                          style={{ paddingTop: vItem.index === 0 ? undefined : config.space.S400 }}
                        >
                          {dmCategory ? (
                            <RoomNavCategoryButton
                              data-category-id={categoryId}
                              onClick={handleCategoryClick}
                              closed={closedCategories.has(categoryId)}
                            >
                              {room?.roomId === space.roomId
                                ? 'Direct Messages'
                                : `Direct Messages - ${room.name}`}
                            </RoomNavCategoryButton>
                          ) : (
                            <NavCategoryHeader>
                              <RoomNavCategoryButton
                                data-category-id={categoryId}
                                onClick={handleCategoryClick}
                                closed={closedCategories.has(categoryId)}
                              >
                                {roomId === space.roomId ? 'Rooms' : room?.name}
                              </RoomNavCategoryButton>
                            </NavCategoryHeader>
                          )}
                        </div>
                      </VirtualTile>
                    );
                  }

                  return (
                    <VirtualTile
                      virtualItem={vItem}
                      key={vItem.index}
                      ref={virtualizer.measureElement}
                    >
                      <RoomNavItem
                        room={room}
                        selected={selectedRoomId === roomId}
                        showAvatar={mDirects.has(roomId)}
                        linkPath={getToLink(roomId)}
                        muted={mutedRooms.includes(roomId)}
                      />
                    </VirtualTile>
                  );
                })}
              </NavCategory>
            </Box>
          </ClientDrawerContentLayout>
        </ClientDrawerLayout>
      }
    >
      <Outlet />
    </ClientContentLayout>
  );
}
