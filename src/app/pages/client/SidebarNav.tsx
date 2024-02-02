import React, { MouseEventHandler, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import {
  Icon,
  Icons,
  AvatarFallback,
  Text,
  AvatarImage,
  Badge,
  PopOut,
  Menu,
  Box,
  config,
  Scroll,
  toRem,
  MenuItem,
  Header,
} from 'folds';
import { useAtomValue } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { JoinRule } from 'matrix-js-sdk';

import {
  Sidebar,
  SidebarContent,
  SidebarStackSeparator,
  SidebarStack,
  SidebarAvatar,
} from '../../components/sidebar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import colorMXID from '../../../util/colorMXID';
import { useDirects, useOrphanRooms, useOrphanSpaces } from '../../state/hooks/roomList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import {
  getDirectPath,
  getExplorePath,
  getHomePath,
  getNotificationsPath,
  getSpacePath,
} from '../pathUtils';
import { getCanonicalAliasRoomId, isRoomAlias } from '../../utils/matrix';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { mDirectAtom } from '../../state/mDirectList';
import { useRoomsUnread } from '../../state/hooks/unread';
import { RoomToUnread, Unread } from '../../../types/matrix/room';
import { millify } from '../../plugins/millify';
import { factoryRoomIdByActivity } from '../../utils/sort';
import { joinRuleToIconSrc } from '../../utils/room';

const renderBadge = (unread: Unread) => (
  <Badge
    size={unread.total > 0 ? '400' : '300'}
    variant={unread.highlight > 0 ? 'Success' : 'Secondary'}
    fill="Solid"
    radii="Pill"
  >
    {unread.total > 0 && <Text size="L400">{millify(unread.total)}</Text>}
  </Badge>
);

function UnreadBadge({ unread, roomToUnread }: { unread: Unread; roomToUnread: RoomToUnread }) {
  const [open, setOpen] = useState(false);
  const mx = useMatrixClient();

  return (
    <PopOut
      open={open}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: () => setOpen(false),
          }}
        >
          <Menu>
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
                <Box
                  direction="Column"
                  style={{ padding: config.space.S200, paddingRight: 0 }}
                  gap="100"
                >
                  {[...(unread.from ?? [])].sort(factoryRoomIdByActivity(mx)).map((roomId) => {
                    const room = mx.getRoom(roomId);
                    const roomUnread = roomToUnread.get(roomId);

                    if (!room || !roomUnread) return null;
                    return (
                      <MenuItem
                        key={roomId}
                        type="button"
                        size="300"
                        radii="300"
                        before={
                          <Icon
                            size="50"
                            src={
                              joinRuleToIconSrc(
                                Icons,
                                room.getJoinRule() ?? JoinRule.Public,
                                false
                              ) ?? Icons.Hash
                            }
                          />
                        }
                        after={roomUnread.total > 0 && renderBadge(roomUnread)}
                      >
                        <Box grow="Yes" as="span">
                          <Text as="span" truncate priority="400">
                            {room.name ?? 'Unknown'}
                          </Text>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Box>
              </Scroll>
            </Box>
          </Menu>
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
          {renderBadge(unread)}
        </Box>
      )}
    </PopOut>
  );
}

export function SidebarNav() {
  const mx = useMatrixClient();

  const mDirects = useAtomValue(mDirectAtom);
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);

  const homeUnread = useRoomsUnread(orphanRooms, roomToUnread);
  const directUnread = useRoomsUnread(directs, roomToUnread);

  const { spaceIdOrAlias } = useParams();
  const spaceId =
    spaceIdOrAlias && isRoomAlias(spaceIdOrAlias)
      ? getCanonicalAliasRoomId(mx, spaceIdOrAlias)
      : spaceIdOrAlias;

  const homeMatch = useMatch(getHomePath());
  const directMatch = useMatch(getDirectPath());
  const notificationMatch = useMatch(getNotificationsPath());
  const exploreMatch = useMatch(getExplorePath());

  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate(getHomePath());
  };

  const handleDirectClick = () => {
    navigate(getDirectPath());
  };

  const handleSpaceClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const target = evt.currentTarget;
    const targetSpaceId = target.getAttribute('data-id');
    if (!targetSpaceId) return;

    const targetSpaceAlias = mx.getRoom(targetSpaceId)?.getCanonicalAlias();
    navigate(getSpacePath(targetSpaceAlias ?? targetSpaceId));
  };

  return (
    <Sidebar>
      <SidebarContent
        scrollable={
          <>
            <SidebarStack>
              <SidebarAvatar
                active={!!homeMatch}
                outlined
                tooltip="Home"
                hasCount={homeUnread && homeUnread.total > 0}
                notificationBadge={() =>
                  homeUnread && <UnreadBadge roomToUnread={roomToUnread} unread={homeUnread} />
                }
                avatarChildren={<Icon src={Icons.Home} filled={!!homeMatch} />}
                onClick={handleHomeClick}
              />
              <SidebarAvatar
                active={!!directMatch}
                outlined
                tooltip="Direct Messages"
                hasCount={directUnread && directUnread.total > 0}
                notificationBadge={() =>
                  directUnread && <UnreadBadge roomToUnread={roomToUnread} unread={directUnread} />
                }
                avatarChildren={<Icon src={Icons.User} filled={!!directMatch} />}
                onClick={handleDirectClick}
              />
            </SidebarStack>
            <SidebarStackSeparator />
            <SidebarStack>
              {orphanSpaces.map((orphanSpaceId) => {
                const space = mx.getRoom(orphanSpaceId);
                if (!space) return null;
                const unread = roomToUnread.get(orphanSpaceId);

                const avatarUrl = space.getAvatarUrl(mx.baseUrl, 96, 96, 'crop');

                return (
                  <SidebarAvatar
                    dataId={orphanSpaceId}
                    onClick={handleSpaceClick}
                    key={orphanSpaceId}
                    active={spaceId === orphanSpaceId}
                    hasCount={unread && unread.total > 0}
                    tooltip={space.name}
                    notificationBadge={() =>
                      unread && <UnreadBadge roomToUnread={roomToUnread} unread={unread} />
                    }
                    avatarChildren={
                      avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={space.name} />
                      ) : (
                        <AvatarFallback
                          style={{
                            backgroundColor: colorMXID(orphanSpaceId),
                            color: 'white',
                          }}
                        >
                          <Text size="T500">{space.name[0]}</Text>
                        </AvatarFallback>
                      )
                    }
                  />
                );
              })}
            </SidebarStack>
            <SidebarStackSeparator />
            <SidebarStack>
              <SidebarAvatar
                active={!!exploreMatch}
                outlined
                tooltip="Explore Community"
                avatarChildren={<Icon src={Icons.Explore} filled={!!exploreMatch} />}
                onClick={() => navigate(getExplorePath())}
              />
              <SidebarAvatar
                outlined
                tooltip="Create Space"
                avatarChildren={<Icon src={Icons.Plus} />}
              />
            </SidebarStack>
          </>
        }
        sticky={
          <>
            <SidebarStackSeparator />
            <SidebarStack>
              <SidebarAvatar
                outlined
                tooltip="Search"
                avatarChildren={<Icon src={Icons.Search} />}
              />
              <SidebarAvatar
                active={!!notificationMatch}
                outlined
                tooltip="Notifications"
                avatarChildren={<Icon src={Icons.Bell} filled={!!notificationMatch} />}
                onClick={() => navigate(getNotificationsPath())}
              />
              <SidebarAvatar
                tooltip="User Settings"
                avatarChildren={
                  <AvatarFallback
                    style={{
                      backgroundColor: 'blue',
                      color: 'white',
                    }}
                  >
                    <Text size="T500">A</Text>
                  </AvatarFallback>
                }
              />
            </SidebarStack>
          </>
        }
      />
    </Sidebar>
  );
}
