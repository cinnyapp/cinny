import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Box, Text } from 'folds';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { useDirects } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
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
import { RoomAvatar } from '../../../components/room-avatar';
import { getDirectRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { RoomUnreadProvider } from '../../../components/RoomUnreadProvider';
import { getRoomAvatarUrl } from '../../../utils/room';
import { nameInitials } from '../../../utils/common';
import { useSelectedRoom } from '../../../hooks/useSelectedRoom';

export function Direct() {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const selectedRoomId = useSelectedRoom();

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
          <ClientDrawerContentLayout>
            <Box direction="Column" gap="400">
              <NavCategory>
                <NavCategoryHeader>
                  <Text size="O400">People</Text>
                </NavCategoryHeader>
                {Array.from(directs)
                  .sort(factoryRoomIdByAtoZ(mx))
                  .map((roomId) => {
                    const room = mx.getRoom(roomId);
                    if (!room) return null;
                    const selected = selectedRoomId === roomId;
                    const avatarSrc = getRoomAvatarUrl(mx, room);

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
                            <NavLink to={getDirectRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}>
                              <NavItemContent size="T300">
                                <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                  <Avatar size="200" radii="400">
                                    <RoomAvatar
                                      src={avatarSrc}
                                      alt={room.name}
                                      renderInitials={() => (
                                        <Text as="span" size="H6">
                                          {nameInitials(room.name)}
                                        </Text>
                                      )}
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
