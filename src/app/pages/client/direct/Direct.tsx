import React, { useMemo, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useAtom, useAtomValue } from 'jotai';
import { Avatar, Box, Button, Icon, Icons, Text } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { factoryRoomIdByActivity } from '../../../utils/sort';
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
import { getDirectCreatePath, getDirectRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { useDirectCreateSelected } from '../../../hooks/router/useDirectSelected';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { muteChangesAtom } from '../../../state/room-list/mutedRoomList';
import { closedNavCategoriesAtom, makeNavCategoryId } from '../../../state/closedNavCategories';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useDirectRooms } from './useDirectRooms';

function DirectEmpty() {
  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={Icons.Mention} />}
        title={
          <Text size="H5" align="Center">
            No Direct Messages
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            You do not have any direct messages yet.
          </Text>
        }
        options={
          <Button variant="Secondary" size="300">
            <Text size="B300" truncate>
              Direct Message
            </Text>
          </Button>
        }
      />
    </NavEmptyCenter>
  );
}

const DEFAULT_CATEGORY_ID = makeNavCategoryId('direct', 'direct');
export function Direct() {
  const mx = useMatrixClient();
  useNavToActivePathMapper('direct');
  const scrollRef = useRef<HTMLDivElement>(null);
  const directs = useDirectRooms();
  const muteChanges = useAtomValue(muteChangesAtom);
  const mutedRooms = muteChanges.added;
  const roomToUnread = useAtomValue(roomToUnreadAtom);

  const selectedRoomId = useSelectedRoom();
  const createSelected = useDirectCreateSelected();
  const noRoomToDisplay = directs.length === 0;
  const [closedCategories, setClosedCategories] = useAtom(closedNavCategoriesAtom);

  const sortedDirects = useMemo(() => {
    const items = Array.from(directs).sort(factoryRoomIdByActivity(mx));
    if (closedCategories.has(DEFAULT_CATEGORY_ID)) {
      return items.filter((rId) => roomToUnread.has(rId) || rId === selectedRoomId);
    }
    return items;
  }, [mx, directs, closedCategories, roomToUnread, selectedRoomId]);

  const virtualizer = useVirtualizer({
    count: sortedDirects.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 10,
  });

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  return (
    <ClientContentLayout
      navigation={
        <ClientDrawerLayout>
          <ClientDrawerHeaderLayout>
            <Box grow="Yes" gap="300">
              <Box grow="Yes">
                <Text size="H4" truncate>
                  Direct Messages
                </Text>
              </Box>
            </Box>
          </ClientDrawerHeaderLayout>
          {noRoomToDisplay ? (
            <DirectEmpty />
          ) : (
            <ClientDrawerContentLayout scrollRef={scrollRef}>
              <Box direction="Column" gap="300">
                <NavCategory>
                  <NavItem variant="Background" radii="400" aria-selected={createSelected}>
                    <NavLink to={getDirectCreatePath()}>
                      <NavItemContent>
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <Icon src={Icons.Plus} size="100" filled={createSelected} />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              Create Chat
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
                      Chats
                    </RoomNavCategoryButton>
                  </NavCategoryHeader>
                  <div
                    style={{
                      position: 'relative',
                      height: virtualizer.getTotalSize(),
                    }}
                  >
                    {virtualizer.getVirtualItems().map((vItem) => {
                      const roomId = sortedDirects[vItem.index];
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
                            showAvatar
                            direct
                            linkPath={getDirectRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
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
