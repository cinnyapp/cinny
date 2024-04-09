import React, { MouseEventHandler, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtom, useAtomValue } from 'jotai';
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
import { closedRoomCategories, makeRoomCategoryId } from '../../../state/closedRoomCategories';

export function Space() {
  const mx = useMatrixClient();
  const space = useSpace();
  const spaceIdOrAlias = getCanonicalAliasOrRoomId(mx, space.roomId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mDirects = useAtomValue(mDirectAtom);
  const muteChanges = useAtomValue(muteChangesAtom);
  const mutedRooms = muteChanges.added;

  const [closedCategories, setClosedCategory] = useAtom(closedRoomCategories);
  const hierarchy = useSpaceHierarchy(
    space.roomId,
    useCallback(
      (spaceRoomId, directCategory) => {
        if (directCategory)
          return closedCategories.has(makeRoomCategoryId(space.roomId, spaceRoomId, 'direct'));
        return closedCategories.has(makeRoomCategoryId(space.roomId, spaceRoomId));
      },
      [space.roomId, closedCategories]
    )
  );

  const selectedRoomId = useSelectedRoom();
  const lobbySelected = useSpaceLobbySelected(spaceIdOrAlias);
  const searchSelected = useSpaceSearchSelected(spaceIdOrAlias);

  const virtualizer = useVirtualizer({
    count: hierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 0,
    overscan: 10,
  });

  const handleCategoryClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const categoryId = evt.currentTarget.getAttribute('data-category-id');
    if (!categoryId) return;
    if (closedCategories.has(categoryId)) {
      setClosedCategory({ type: 'DELETE', categoryId });
      return;
    }
    setClosedCategory({ type: 'PUT', categoryId });
  };

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
                      ? makeRoomCategoryId(space.roomId, roomId, 'direct')
                      : makeRoomCategoryId(space.roomId, roomId);

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
                        direct={mDirects.has(roomId)}
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
