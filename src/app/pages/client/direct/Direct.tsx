import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Box, Button, Icon, Icons, Text } from 'folds';
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
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../../components/unread-badge';
import { RoomAvatar } from '../../../components/room-avatar';
import { getDirectCreatePath, getDirectRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { RoomUnreadProvider } from '../../../components/RoomUnreadProvider';
import { getRoomAvatarUrl } from '../../../utils/room';
import { nameInitials } from '../../../utils/common';
import { useSelectedRoom } from '../../../hooks/useSelectedRoom';
import { useDirectCreateSelected } from '../../../hooks/useDirectSelected';

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

export function Direct() {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const selectedRoomId = useSelectedRoom();
  const createSelected = useDirectCreateSelected();
  const noRoomToDisplay = directs.length === 0;

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
            <ClientDrawerContentLayout>
              <Box direction="Column" gap="300">
                <NavCategory>
                  <NavItem variant="Background" radii="400" aria-selected={createSelected}>
                    <NavLink to={getDirectCreatePath()}>
                      <NavItemContent size="T300">
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
                              <NavLink
                                to={getDirectRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                              >
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
          )}
        </ClientDrawerLayout>
      }
    >
      <Outlet />
    </ClientContentLayout>
  );
}
