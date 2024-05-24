import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Icon, Icons, Text } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtom, useAtomValue } from 'jotai';
import { factoryRoomIdByActivity, factoryRoomIdByAtoZ } from '../../../utils/sort';
import {
  NavButton,
  NavCategory,
  NavCategoryHeader,
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { getExplorePath, getHomeRoomPath, getHomeSearchPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { useHomeSearchSelected } from '../../../hooks/router/useHomeSelected';
import { useHomeRooms } from './useHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { closedNavCategoriesAtom, makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { openCreateRoom, openJoinAlias } from '../../../../client/action/navigation';
import { PageNav, PageNavHeader, PageNavContent } from '../../../components/page';

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
            <Button onClick={() => openCreateRoom()} variant="Secondary" size="300">
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

const DEFAULT_CATEGORY_ID = makeNavCategoryId('home', 'room');
export function Home() {
  const mx = useMatrixClient();
  useNavToActivePathMapper('home');
  const scrollRef = useRef<HTMLDivElement>(null);
  const rooms = useHomeRooms();
  const muteChanges = useAtomValue(muteChangesAtom);
  const mutedRooms = muteChanges.added;
  const roomToUnread = useAtomValue(roomToUnreadAtom);

  const selectedRoomId = useSelectedRoom();
  const searchSelected = useHomeSearchSelected();
  const noRoomToDisplay = rooms.length === 0;
  const [closedCategories, setClosedCategories] = useAtom(closedNavCategoriesAtom);

  const sortedRooms = useMemo(() => {
    const items = Array.from(rooms).sort(
      closedCategories.has(DEFAULT_CATEGORY_ID)
        ? factoryRoomIdByActivity(mx)
        : factoryRoomIdByAtoZ(mx)
    );
    if (closedCategories.has(DEFAULT_CATEGORY_ID)) {
      return items.filter((rId) => roomToUnread.has(rId) || rId === selectedRoomId);
    }
    return items;
  }, [mx, rooms, closedCategories, roomToUnread, selectedRoomId]);

  const virtualizer = useVirtualizer({
    count: sortedRooms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 10,
  });

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  return (
    <PageNav>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Home
            </Text>
          </Box>
        </Box>
      </PageNavHeader>
      {noRoomToDisplay ? (
        <HomeEmpty />
      ) : (
        <PageNavContent scrollRef={scrollRef}>
          <Box direction="Column" gap="300">
            <NavCategory>
              <NavItem variant="Background" radii="400">
                <NavButton onClick={() => openCreateRoom()}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Plus} size="100" />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          Create Room
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavButton>
              </NavItem>
              <NavItem variant="Background" radii="400">
                <NavButton onClick={() => openJoinAlias()}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Link} size="100" />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          Join with Address
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavButton>
              </NavItem>
              <NavItem variant="Background" radii="400" aria-selected={searchSelected}>
                <NavLink to={getHomeSearchPath()}>
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
                        linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                        muted={mutedRooms.includes(roomId)}
                      />
                    </VirtualTile>
                  );
                })}
              </div>
            </NavCategory>
          </Box>
        </PageNavContent>
      )}
    </PageNav>
  );
}
