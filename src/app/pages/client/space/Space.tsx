import React, { useRef } from 'react';
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
import { RoomNavItem } from '../../../features/room-nav-item/RoomNavItem';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';

export function Space() {
  const mx = useMatrixClient();
  const space = useSpace();
  const spaceIdOrAlias = getCanonicalAliasOrRoomId(mx, space.roomId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mDirects = useAtomValue(mDirectAtom);
  const muteChanges = useAtomValue(muteChangesAtom);
  const mutedRooms = muteChanges.added;

  const hierarchy = useSpaceHierarchy(space.roomId);

  const selectedRoomId = useSelectedRoom();
  const lobbySelected = useSpaceLobbySelected(spaceIdOrAlias);
  const searchSelected = useSpaceSearchSelected(spaceIdOrAlias);

  const virtualizer = useVirtualizer({
    count: hierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 10,
  });

  const getToLink = (roomId: string) =>
    getSpaceRoomPath(spaceIdOrAlias, getCanonicalAliasOrRoomId(mx, roomId));

  let isLastDM = false;
  let lastSpaceId: string | undefined;
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
                    isLastDM = false;
                    lastSpaceId = roomId;
                    return (
                      <VirtualTile
                        virtualItem={vItem}
                        key={vItem.index}
                        ref={virtualizer.measureElement}
                      >
                        <NavCategoryHeader
                          style={{ paddingTop: vItem.index === 0 ? undefined : config.space.S300 }}
                        >
                          <Text size="O400" truncate>
                            {roomId === space.roomId ? 'Rooms' : room.name}
                          </Text>
                        </NavCategoryHeader>
                      </VirtualTile>
                    );
                  }

                  const direct = mDirects.has(roomId);
                  const peopleHeader = direct && !isLastDM;
                  isLastDM = direct;
                  const lastSpace = mx.getRoom(lastSpaceId);
                  const selected = selectedRoomId === roomId;
                  return (
                    <VirtualTile
                      virtualItem={vItem}
                      key={vItem.index}
                      ref={virtualizer.measureElement}
                    >
                      {peopleHeader && (
                        <div style={{ paddingTop: config.space.S300 }}>
                          <NavCategoryHeader>
                            <Text size="O400" truncate>
                              {lastSpace?.roomId === space.roomId
                                ? 'People'
                                : `${lastSpace?.name} - People`}
                            </Text>
                          </NavCategoryHeader>
                        </div>
                      )}
                      <RoomNavItem
                        room={room}
                        selected={selected}
                        direct={direct}
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
