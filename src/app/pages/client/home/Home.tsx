import React, { MouseEventHandler, useMemo, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Icon, Icons, Text } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue } from 'jotai';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { factoryRoomIdByAtoZ } from '../../../utils/sort';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import {
  NavCategory,
  NavCategoryHeader,
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import {
  getExplorePath,
  getHomeCreatePath,
  getHomeJoinPath,
  getHomeRoomPath,
  getHomeSearchPath,
} from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useHomeCreateSelected,
  useHomeJoinSelected,
  useHomeSearchSelected,
} from '../../../hooks/router/useHomeSelected';
import { useHomeRooms } from './useHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { closedRoomCategories, makeRoomCategoryId } from '../../../state/closedRoomCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';

function HomeEmpty() {
  const navigate = useNavigate();

  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={Icons.Hash} />}
        title={
          <Text size="H5" align="Center">
            No Rooms
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            You do not have any rooms yet.
          </Text>
        }
        options={
          <>
            <Button onClick={() => navigate(getHomeCreatePath())} variant="Secondary" size="300">
              <Text size="B300" truncate>
                Create Room
              </Text>
            </Button>
            <Button
              onClick={() => navigate(getExplorePath())}
              variant="Secondary"
              fill="Soft"
              size="300"
            >
              <Text size="B300" truncate>
                Explore Community Rooms
              </Text>
            </Button>
          </>
        }
      />
    </NavEmptyCenter>
  );
}

const DEFAULT_CATEGORY_ID = makeRoomCategoryId('home', 'room');
export function Home() {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rooms = useHomeRooms();
  const muteChanges = useAtomValue(muteChangesAtom);
  const mutedRooms = muteChanges.added;
  const roomToUnread = useAtomValue(roomToUnreadAtom);

  const selectedRoomId = useSelectedRoom();
  const createSelected = useHomeCreateSelected();
  const joinSelected = useHomeJoinSelected();
  const searchSelected = useHomeSearchSelected();
  const noRoomToDisplay = rooms.length === 0;
  const [closedCategories, setClosedCategory] = useAtom(closedRoomCategories);

  const sortedRooms = useMemo(() => {
    const items = Array.from(rooms).sort(factoryRoomIdByAtoZ(mx));
    if (closedCategories.has(DEFAULT_CATEGORY_ID)) {
      return items.filter((rId) => roomToUnread.has(rId));
    }
    return items;
  }, [mx, rooms, closedCategories, roomToUnread]);

  const virtualizer = useVirtualizer({
    count: sortedRooms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
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

  return (
    <ClientContentLayout
      navigation={
        <ClientDrawerLayout>
          <ClientDrawerHeaderLayout>
            <Box grow="Yes" gap="300">
              <Box grow="Yes">
                <Text size="H4" truncate>
                  Home
                </Text>
              </Box>
            </Box>
          </ClientDrawerHeaderLayout>
          {noRoomToDisplay ? (
            <HomeEmpty />
          ) : (
            <ClientDrawerContentLayout scrollRef={scrollRef}>
              <Box direction="Column" gap="300">
                <NavCategory>
                  <NavItem variant="Background" radii="400" aria-selected={createSelected}>
                    <NavLink to={getHomeCreatePath()}>
                      <NavItemContent size="T300">
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <Icon src={Icons.Plus} size="100" filled={createSelected} />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              Create Room
                            </Text>
                          </Box>
                        </Box>
                      </NavItemContent>
                    </NavLink>
                  </NavItem>
                  <NavItem variant="Background" radii="400" aria-selected={joinSelected}>
                    <NavLink to={getHomeJoinPath()}>
                      <NavItemContent size="T300">
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <Icon src={Icons.Link} size="100" filled={joinSelected} />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              Join with Address
                            </Text>
                          </Box>
                        </Box>
                      </NavItemContent>
                    </NavLink>
                  </NavItem>
                  <NavItem variant="Background" radii="400" aria-selected={searchSelected}>
                    <NavLink to={getHomeSearchPath()}>
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
                <NavCategory>
                  <NavCategoryHeader>
                    <RoomNavCategoryButton
                      closed={closedCategories.has(DEFAULT_CATEGORY_ID)}
                      data-category-id={DEFAULT_CATEGORY_ID}
                      onClick={handleCategoryClick}
                    >
                      Rooms
                    </RoomNavCategoryButton>
                  </NavCategoryHeader>
                  <div
                    style={{
                      position: 'relative',
                      height: virtualizer.getTotalSize(),
                    }}
                  >
                    {virtualizer.getVirtualItems().map((vItem) => {
                      const roomId = sortedRooms[vItem.index];
                      const room = mx.getRoom(roomId);
                      if (!room) return null;
                      const selected = selectedRoomId === roomId;

                      return (
                        <VirtualTile
                          virtualItem={vItem}
                          key={vItem.index}
                          ref={virtualizer.measureElement}
                        >
                          <RoomNavItem
                            room={room}
                            selected={selected}
                            direct={false}
                            linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                            muted={mutedRooms.includes(roomId)}
                          />
                        </VirtualTile>
                      );
                    })}
                  </div>
                </NavCategory>
              </Box>
            </ClientDrawerContentLayout>
          )}
        </ClientDrawerLayout>
      }
    >
      <Outlet />
    </ClientContentLayout>
  );
}
