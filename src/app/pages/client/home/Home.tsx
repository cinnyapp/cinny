import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { JoinRule } from 'matrix-js-sdk';
import { Avatar, Box, Icon, Icons, Text } from 'folds';
import { ClientContentLayout } from '../ClientContentLayout';
import { ClientDrawerLayout } from '../ClientDrawerLayout';
import { ClientDrawerHeaderLayout } from '../ClientDrawerHeaderLayout';
import { useOrphanRooms } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { factoryRoomIdByAtoZ } from '../../../utils/sort';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { joinRuleToIconSrc } from '../../../utils/room';
import { ClientDrawerContentLayout } from '../ClientDrawerContentLayout';
import { NavItem, NavItemContent } from '../../../components/nav-item';
import { UnreadBadge, UnreadBadgeCenter } from '../../../components/unread-badge';

export function Home() {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const rooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);

  const roomToUnread = useAtomValue(roomToUnreadAtom);

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
          <ClientDrawerContentLayout>
            <Box direction="Column">
              {rooms.sort(factoryRoomIdByAtoZ(mx)).map((roomId) => {
                const room = mx.getRoom(roomId);
                if (!room) return null;
                const unread = roomToUnread.get(roomId);

                return (
                  <NavItem variant="Background" radii="400" highlight={!!unread}>
                    <NavItemContent>
                      <Box as="span" grow="Yes" alignItems="Center" gap="200">
                        <Avatar size="200" radii="400">
                          <Icon
                            size="100"
                            src={
                              joinRuleToIconSrc(
                                Icons,
                                room.getJoinRule() ?? JoinRule.Public,
                                false
                              ) ?? Icons.Hash
                            }
                          />
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
                  </NavItem>
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
