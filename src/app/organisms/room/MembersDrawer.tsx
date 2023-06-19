import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Box,
  Chip,
  ContainerColor,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuItem,
  PopOut,
  Scroll,
  Text,
  color,
  config,
} from 'folds';
import { Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import millify from 'millify';

import * as css from './MembersDrawer.css';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import { Membership } from '../../../types/matrix/room';
import { UseStateProvider } from '../../components/UseStateProvider';

export const MembershipFilters = {
  filterJoined: (m: RoomMember) => m.membership === Membership.Join,
  filterInvited: (m: RoomMember) => m.membership === Membership.Invite,
  filterLeaved: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() === m.events.member?.getSender(),
  filterKicked: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() !== m.events.member?.getSender(),
  filterBanned: (m: RoomMember) => m.membership === Membership.Ban,
};

export type MembershipFilterFn = (m: RoomMember) => boolean;

export type MembershipFilter = {
  name: string;
  filterFn: MembershipFilterFn;
  color: ContainerColor;
};

const useMembershipFilterMenu = (): MembershipFilter[] =>
  useMemo(
    () => [
      {
        name: 'Joined',
        filterFn: MembershipFilters.filterJoined,
        color: 'Primary',
      },
      {
        name: 'Invited',
        filterFn: MembershipFilters.filterInvited,
        color: 'Success',
      },
      {
        name: 'Left',
        filterFn: MembershipFilters.filterLeaved,
        color: 'Secondary',
      },
      {
        name: 'Kicked',
        filterFn: MembershipFilters.filterKicked,
        color: 'Warning',
      },
      {
        name: 'Banned',
        filterFn: MembershipFilters.filterBanned,
        color: 'Critical',
      },
    ],
    []
  );

export const SortFilters = {
  filterAscending: (a: RoomMember, b: RoomMember) =>
    a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1,
  filterDescending: (a: RoomMember, b: RoomMember) =>
    a.name.toLowerCase() > b.name.toLowerCase() ? -1 : 1,
  filterNewestFirst: (a: RoomMember, b: RoomMember) =>
    (b.events.member?.getTs() ?? 0) - (a.events.member?.getTs() ?? 0),
  filterOldest: (a: RoomMember, b: RoomMember) =>
    (a.events.member?.getTs() ?? 0) - (b.events.member?.getTs() ?? 0),
};

export type SortFilterFn = (a: RoomMember, b: RoomMember) => number;

export type SortFilter = {
  name: string;
  filterFn: SortFilterFn;
};

const useSortFilterMenu = (): SortFilter[] =>
  useMemo(
    () => [
      {
        name: 'Ascending',
        filterFn: SortFilters.filterAscending,
      },
      {
        name: 'Descending',
        filterFn: SortFilters.filterDescending,
      },
      {
        name: 'Newest First',
        filterFn: SortFilters.filterNewestFirst,
      },
      {
        name: 'Oldest First',
        filterFn: SortFilters.filterOldest,
      },
    ],
    []
  );

export type MembersFilterOptions = {
  membershipFilter: MembershipFilter;
  sortFilter: SortFilter;
};

type MembersDrawerProps = {
  room: Room;
};
export function MembersDrawer({ room }: MembersDrawerProps) {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterOptionsRef = useRef<HTMLDivElement>(null);
  const members = useRoomMembers(mx, room.roomId);

  const membershipFilterMenu = useMembershipFilterMenu();
  const sortFilterMenu = useSortFilterMenu();
  const [filter, setFilter] = useState<MembersFilterOptions>({
    membershipFilter: membershipFilterMenu[0],
    sortFilter: sortFilterMenu[0],
  });
  const [onTop, setOnTop] = useState(true);

  const filteredMembers: RoomMember[] = useMemo(
    () => members.filter(filter.membershipFilter.filterFn).sort(filter.sortFilter.filterFn),
    [members, filter]
  );

  const virtualizer = useVirtualizer({
    count: filteredMembers.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  useIntersectionObserver(
    useCallback((intersectionEntries) => {
      if (!filterOptionsRef.current) return;
      const entry = getIntersectionObserverEntry(filterOptionsRef.current, intersectionEntries);
      if (entry) setOnTop(entry.isIntersecting);
    }, []),
    useCallback(() => ({ root: scrollRef.current }), []),
    useCallback(() => filterOptionsRef.current, [])
  );

  return (
    <Box className={css.MembersDrawer} direction="Column">
      <Header className={css.MembersDrawerHeader} variant="Background" size="600">
        <Box grow="Yes" alignItems="Center" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H5" truncate>
              {`${millify(room.getJoinedMemberCount(), { precision: 1 })} Members`}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center">
            <IconButton variant="Background">
              <Icon src={Icons.UserPlus} />
            </IconButton>
          </Box>
        </Box>
      </Header>
      <Box className={css.MemberDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover">
          <Box className={css.MemberDrawerContent} direction="Column" gap="400">
            <Box className={css.DrawerGroup} direction="Column" gap="100">
              <Text size="L400">Search</Text>
              <Input placeholder="Type name..." variant="Surface" size="300" outlined />
            </Box>

            <Box ref={filterOptionsRef} className={css.DrawerGroup} direction="Column" gap="100">
              <Text size="L400">Filter</Text>
              <Box alignItems="Center" gap="100" wrap="Wrap">
                <UseStateProvider initial={false}>
                  {(open, setOpen) => (
                    <PopOut
                      open={open}
                      position="Bottom"
                      align="Start"
                      content={
                        <FocusTrap
                          focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: () => setOpen(false),
                            clickOutsideDeactivates: true,
                            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                          }}
                        >
                          <Menu style={{ padding: config.space.S100 }}>
                            {membershipFilterMenu.map((menuItem) => (
                              <MenuItem
                                key={menuItem.name}
                                variant={
                                  menuItem.name === filter.membershipFilter.name
                                    ? menuItem.color
                                    : 'Surface'
                                }
                                radii="300"
                                onClick={() => {
                                  setFilter((f) => ({ ...f, membershipFilter: menuItem }));
                                  setOpen(false);
                                }}
                              >
                                <Text>{menuItem.name}</Text>
                              </MenuItem>
                            ))}
                          </Menu>
                        </FocusTrap>
                      }
                    >
                      {(anchorRef) => (
                        <Chip
                          ref={anchorRef}
                          onClick={() => setOpen(!open)}
                          variant={filter.membershipFilter.color}
                          radii="Pill"
                          outlined
                          after={<Icon src={Icons.ChevronBottom} size="50" />}
                        >
                          <Text size="T200">{filter.membershipFilter.name}</Text>
                        </Chip>
                      )}
                    </PopOut>
                  )}
                </UseStateProvider>
                <UseStateProvider initial={false}>
                  {(open, setOpen) => (
                    <PopOut
                      open={open}
                      position="Bottom"
                      align="Start"
                      content={
                        <FocusTrap
                          focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: () => setOpen(false),
                            clickOutsideDeactivates: true,
                            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                          }}
                        >
                          <Menu style={{ padding: config.space.S100 }}>
                            {sortFilterMenu.map((menuItem) => (
                              <MenuItem
                                key={menuItem.name}
                                variant="Surface"
                                aria-pressed={menuItem.name === filter.sortFilter.name}
                                radii="300"
                                onClick={() => {
                                  setFilter((f) => ({ ...f, sortFilter: menuItem }));
                                  setOpen(false);
                                }}
                              >
                                <Text>{menuItem.name}</Text>
                              </MenuItem>
                            ))}
                          </Menu>
                        </FocusTrap>
                      }
                    >
                      {(anchorRef) => (
                        <Chip
                          ref={anchorRef}
                          onClick={() => setOpen(!open)}
                          variant="Surface"
                          radii="Pill"
                          outlined
                          after={<Icon src={Icons.ChevronBottom} size="50" />}
                        >
                          <Text size="T200">{`Order: ${filter.sortFilter.name}`}</Text>
                        </Chip>
                      )}
                    </PopOut>
                  )}
                </UseStateProvider>
              </Box>
            </Box>

            {!onTop && (
              <Box className={css.DrawerScrollTop}>
                <IconButton
                  onClick={() => virtualizer.scrollToOffset(0)}
                  variant="Surface"
                  radii="Pill"
                  outlined
                  size="300"
                  aria-label="Scroll to Top"
                >
                  <Icon src={Icons.ChevronTop} size="300" />
                </IconButton>
              </Box>
            )}

            <Box className={css.MembersGroup} direction="Column" gap="100">
              <Text className={css.MembersGroupLabel} size="L400">
                Admins
              </Text>
              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const member = filteredMembers[vItem.index];
                  const avatarUrl = member.getAvatarUrl(
                    mx.baseUrl,
                    100,
                    100,
                    'crop',
                    undefined,
                    false
                  );

                  return (
                    <Box
                      style={{
                        padding: config.space.S200,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vItem.start}px)`,
                      }}
                      data-index={vItem.index}
                      ref={virtualizer.measureElement}
                      key={`${room.roomId}-${member.userId}`}
                      alignItems="Center"
                      gap="200"
                    >
                      <Avatar size="200">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} />
                        ) : (
                          <AvatarFallback
                            style={{
                              background: color.Secondary.Container,
                              color: color.Secondary.OnContainer,
                            }}
                          >
                            <Text size="T200">{member.name[0]}</Text>
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <Text size="T400" truncate>
                        {member.name}
                      </Text>
                    </Box>
                  );
                })}
              </div>
            </Box>
          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}
