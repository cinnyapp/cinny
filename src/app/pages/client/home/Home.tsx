import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Icon, Icons, Text } from 'folds';
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
import { UnreadBadge, UnreadBadgeCenter } from '../../../components/unread-badge';
import { RoomIcon } from '../../../components/room-avatar';
import {
  getExplorePath,
  getHomeCreatePath,
  getHomeJoinPath,
  getHomeRoomPath,
  getHomeSearchPath,
} from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { RoomUnreadProvider } from '../../../components/RoomUnreadProvider';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useHomeCreateSelected,
  useHomeJoinSelected,
  useHomeSearchSelected,
} from '../../../hooks/router/useHomeSelected';
import { useHomeRooms } from './useHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

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

export function Home() {
  const mx = useMatrixClient();
  const rooms = useHomeRooms();
  const selectedRoomId = useSelectedRoom();
  const createSelected = useHomeCreateSelected();
  const joinSelected = useHomeJoinSelected();
  const searchSelected = useHomeSearchSelected();
  const noRoomToDisplay = rooms.length === 0;

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
            <ClientDrawerContentLayout>
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
                    <Text size="O400">Rooms</Text>
                  </NavCategoryHeader>
                  {Array.from(rooms)
                    .sort(factoryRoomIdByAtoZ(mx))
                    .map((roomId) => {
                      const room = mx.getRoom(roomId);
                      if (!room) return null;
                      const selected = selectedRoomId === roomId;

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
                              <NavLink to={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}>
                                <NavItemContent size="T300">
                                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                                    <Avatar size="200" radii="400">
                                      <RoomIcon
                                        filled={selected}
                                        size="100"
                                        joinRule={room.getJoinRule()}
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
