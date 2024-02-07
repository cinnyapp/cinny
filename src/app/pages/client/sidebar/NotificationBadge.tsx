import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { PopOut, Menu, Box, toRem, config, Text, Header, Scroll, Avatar } from 'folds';
import FocusTrap from 'focus-trap-react';

import { Unread } from '../../../../types/matrix/room';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { factoryRoomIdByActivity, factoryRoomIdByUnreadCount } from '../../../utils/sort';
import { RoomAvatar, RoomIcon } from '../../../components/room-avatar';
import { UnreadBadge, UnreadBadgeCenter } from '../../../components/unread-badge';
import { mDirectAtom } from '../../../state/mDirectList';
import { getRoomAvatarUrl } from '../../../utils/room';
import { nameInitials } from '../../../utils/common';
import { NavItem, NavItemContent, NavLink } from '../../../components/nav-item';
import { getHomeRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/useSelectedRoom';

function UnreadMenu({ rooms, requestClose }: { rooms: string[]; requestClose: () => void }) {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const selectedRoomId = useSelectedRoom();

  return (
    <Menu style={{ width: toRem(250) }}>
      <Box direction="Column" style={{ maxHeight: '70vh', maxWidth: toRem(300) }}>
        <Header
          size="300"
          style={{
            padding: `0 ${config.space.S200}`,
            flexShrink: 0,
            borderBottomWidth: config.borderWidth.B300,
          }}
        >
          <Text size="L400">Unread Rooms</Text>
        </Header>
        <Scroll size="300" hideTrack>
          <Box direction="Column" style={{ padding: config.space.S200, paddingRight: 0 }}>
            {rooms
              .sort(factoryRoomIdByActivity(mx))
              .sort(factoryRoomIdByUnreadCount((rId) => roomToUnread.get(rId)?.total ?? 0))
              .map((roomId) => {
                const room = mx.getRoom(roomId);
                if (!room) return null;
                const avatarSrc = getRoomAvatarUrl(mx, room, 32);

                const roomUnread = roomToUnread.get(roomId);
                if (!roomUnread) return null;

                return (
                  <NavItem
                    key={roomId}
                    variant="Surface"
                    radii="400"
                    highlight={!!roomUnread || selectedRoomId === roomId}
                    aria-selected={selectedRoomId === roomId}
                  >
                    <NavLink
                      onClick={requestClose}
                      to={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                    >
                      <NavItemContent size="T300">
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200">
                            {mDirects.has(roomId) ? (
                              <RoomAvatar
                                src={avatarSrc}
                                alt={room.name}
                                renderInitials={() => (
                                  <Text as="span" size="H6">
                                    {nameInitials(room.name)}
                                  </Text>
                                )}
                              />
                            ) : (
                              <RoomIcon size="50" joinRule={room.getJoinRule()} />
                            )}
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              {room.name}
                            </Text>
                          </Box>
                          {roomUnread && (
                            <UnreadBadgeCenter>
                              <UnreadBadge
                                highlight={roomUnread.highlight > 0}
                                count={roomUnread.total}
                              />
                            </UnreadBadgeCenter>
                          )}
                        </Box>
                      </NavItemContent>
                    </NavLink>
                  </NavItem>
                );
              })}
          </Box>
        </Scroll>
      </Box>
    </Menu>
  );
}

export function NotificationBadge({ unread }: { unread: Unread }) {
  const unreadRooms = [...(unread.from ?? [])];
  const [open, setOpen] = useState(false);
  const closeUnreadMenu = () => setOpen(false);

  return (
    <PopOut
      open={open}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: closeUnreadMenu,
          }}
        >
          <UnreadMenu rooms={unreadRooms} requestClose={closeUnreadMenu} />
        </FocusTrap>
      }
      position="Bottom"
      align="Start"
      alignOffset={55}
      offset={0}
    >
      {(targetRef) => (
        <Box
          as="button"
          style={{ cursor: 'pointer' }}
          ref={targetRef}
          type="button"
          onClick={() => setOpen(!open)}
        >
          <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
        </Box>
      )}
    </PopOut>
  );
}
