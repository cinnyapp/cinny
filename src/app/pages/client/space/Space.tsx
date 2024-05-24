import React, { useCallback, useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Avatar, Box, Icon, Icons, Text, config } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
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
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { closedNavCategoriesAtom, makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useRoomName } from '../../../hooks/useRoomMeta';
import { useSpaceJoinedHierarchy } from '../../../hooks/useSpaceHierarchy';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';

export function Space() {
  const mx = useMatrixClient();
  const space = useSpace();
  useNavToActivePathMapper(space.roomId);
  const spaceIdOrAlias = getCanonicalAliasOrRoomId(mx, space.roomId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mDirects = useAtomValue(mDirectAtom);
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const allRooms = useAtomValue(allRoomsAtom);
  const allJoinedRooms = useMemo(() => new Set(allRooms), [allRooms]);
  const muteChanges = useAtomValue(muteChangesAtom);
  const mutedRooms = muteChanges.added;
  const spaceName = useRoomName(space);

  const selectedRoomId = useSelectedRoom();
  const lobbySelected = useSpaceLobbySelected(spaceIdOrAlias);
  const searchSelected = useSpaceSearchSelected(spaceIdOrAlias);

  const [closedCategories, setClosedCategories] = useAtom(closedNavCategoriesAtom);

  const getRoom = useCallback(
    (rId: string) => {
      if (allJoinedRooms.has(rId)) {
        return mx.getRoom(rId) ?? undefined;
      }
      return undefined;
    },
    [mx, allJoinedRooms]
  );

  const hierarchy = useSpaceJoinedHierarchy(
    space.roomId,
    getRoom,
    useCallback(
      (parentId, roomId) => {
        if (!closedCategories.has(makeNavCategoryId(space.roomId, parentId))) {
          return false;
        }
        const showRoom = roomToUnread.has(roomId) || roomId === selectedRoomId;
        if (showRoom) return false;
        return true;
      },
      [space.roomId, closedCategories, roomToUnread, selectedRoomId]
    ),
    useCallback(
      (sId) => closedCategories.has(makeNavCategoryId(space.roomId, sId)),
      [closedCategories, space.roomId]
    )
  );

  const virtualizer = useVirtualizer({
    count: hierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 0,
    overscan: 10,
  });

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  const getToLink = (roomId: string) =>
    getSpaceRoomPath(spaceIdOrAlias, getCanonicalAliasOrRoomId(mx, roomId));

  return (
    <PageNav>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              {spaceName}
            </Text>
          </Box>
        </Box>
      </PageNavHeader>
      <PageNavContent scrollRef={scrollRef}>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={lobbySelected}>
              <NavLink to={getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, space.roomId))}>
                <NavItemContent>
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
                <NavItemContent>
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
              const { roomId } = hierarchy[vItem.index] ?? {};
              const room = mx.getRoom(roomId);
              if (!room) return null;

              if (room.isSpaceRoom()) {
                const categoryId = makeNavCategoryId(space.roomId, roomId);

                return (
                  <VirtualTile
                    virtualItem={vItem}
                    key={vItem.index}
                    ref={virtualizer.measureElement}
                  >
                    <div style={{ paddingTop: vItem.index === 0 ? undefined : config.space.S400 }}>
                      <NavCategoryHeader>
                        <RoomNavCategoryButton
                          data-category-id={categoryId}
                          onClick={handleCategoryClick}
                          closed={closedCategories.has(categoryId)}
                        >
                          {roomId === space.roomId ? 'Rooms' : room?.name}
                        </RoomNavCategoryButton>
                      </NavCategoryHeader>
                    </div>
                  </VirtualTile>
                );
              }

              return (
                <VirtualTile virtualItem={vItem} key={vItem.index} ref={virtualizer.measureElement}>
                  <RoomNavItem
                    room={room}
                    selected={selectedRoomId === roomId}
                    showAvatar={mDirects.has(roomId)}
                    direct={mDirects.has(roomId)}
                    linkPath={getToLink(roomId)}
                    muted={mutedRooms.includes(roomId)}
                  />
                </VirtualTile>
              );
            })}
          </NavCategory>
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
