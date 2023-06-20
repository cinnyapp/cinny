import React, { ChangeEventHandler, useCallback, useMemo, useRef, useState } from 'react';
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
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  color,
  config,
} from 'folds';
import { Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import millify from 'millify';

import { openInviteUser } from '../../../client/action/navigation';
import * as css from './MembersDrawer.css';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import { Membership } from '../../../types/matrix/room';
import { UseStateProvider } from '../../components/UseStateProvider';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../hooks/useAsyncSearch';
import { useDebounce } from '../../hooks/useDebounce';

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
        name: 'A to Z',
        filterFn: SortFilters.filterAscending,
      },
      {
        name: 'Z to A',
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

type PowerLevelTag = {
  name: string;
};
export const usePowerLevelTag = () => {
  const powerLevelTags = useMemo(
    () => ({
      9000: {
        name: 'Goku',
      },
      101: {
        name: 'Founder',
      },
      100: {
        name: 'Admin',
      },
      50: {
        name: 'Moderator',
      },
      0: {
        name: 'Default',
      },
    }),
    []
  );

  return useCallback(
    (powerLevel: number): PowerLevelTag => {
      if (powerLevel >= 9000) return powerLevelTags[9000];
      if (powerLevel >= 101) return powerLevelTags[101];
      if (powerLevel === 100) return powerLevelTags[100];
      if (powerLevel >= 50) return powerLevelTags[50];
      return powerLevelTags[0];
    },
    [powerLevelTags]
  );
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 100,
  matchOptions: {
    contain: true,
  },
};
const getMemberItemStr = (m: RoomMember) => [m.name, m.userId];

type MembersDrawerProps = {
  room: Room;
};
export function MembersDrawer({ room }: MembersDrawerProps) {
  const mx = useMatrixClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
  const members = useRoomMembers(mx, room.roomId);
  const getPowerLevelTag = usePowerLevelTag();

  const membershipFilterMenu = useMembershipFilterMenu();
  const sortFilterMenu = useSortFilterMenu();
  const [filter, setFilter] = useState<MembersFilterOptions>({
    membershipFilter: membershipFilterMenu[0],
    sortFilter: sortFilterMenu[0],
  });
  const [onTop, setOnTop] = useState(true);

  const filteredMembers = useMemo(
    () =>
      members
        .filter(filter.membershipFilter.filterFn)
        .sort(filter.sortFilter.filterFn)
        .sort((a, b) => b.powerLevel - a.powerLevel),
    [members, filter]
  );

  const [result, search] = useAsyncSearch(filteredMembers, getMemberItemStr, SEARCH_OPTIONS);
  if (!result && searchInputRef.current) searchInputRef.current.value = '';

  const processMembers = result ? result.items : filteredMembers;

  const PLTagOrRoomMember = useMemo(() => {
    let prevTag: PowerLevelTag | undefined;
    const tagOrMember: Array<PowerLevelTag | RoomMember> = [];
    processMembers.forEach((m) => {
      const plTag = getPowerLevelTag(m.powerLevel);
      if (plTag !== prevTag) {
        prevTag = plTag;
        tagOrMember.push(plTag);
      }
      tagOrMember.push(m);
    });
    return tagOrMember;
  }, [processMembers, getPowerLevelTag]);

  const virtualizer = useVirtualizer({
    count: PLTagOrRoomMember.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  useIntersectionObserver(
    useCallback((intersectionEntries) => {
      if (!scrollTopAnchorRef.current) return;
      const entry = getIntersectionObserverEntry(scrollTopAnchorRef.current, intersectionEntries);
      if (entry) setOnTop(entry.isIntersecting);
    }, []),
    useCallback(() => ({ root: scrollRef.current }), []),
    useCallback(() => scrollTopAnchorRef.current, [])
  );

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
    useCallback((evt) => search(evt.target.value.trim()), [search]),
    { wait: 200 }
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
            <TooltipProvider
              position="Bottom"
              align="End"
              tooltip={
                <Tooltip>
                  <Text>Invite Member</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton
                  ref={triggerRef}
                  variant="Background"
                  onClick={() => openInviteUser(room.roomId)}
                >
                  <Icon src={Icons.UserPlus} />
                </IconButton>
              )}
            </TooltipProvider>
          </Box>
        </Box>
      </Header>
      <Box className={css.MemberDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover">
          <Box className={css.MemberDrawerContent} direction="Column" gap="400">
            <Box className={css.DrawerGroup} direction="Column" gap="100">
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
                          radii="400"
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
                          radii="400"
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

            <Box ref={scrollTopAnchorRef} className={css.DrawerGroup} direction="Column" gap="100">
              <Text size="L400">Search</Text>
              <Input
                ref={searchInputRef}
                onChange={handleSearchChange}
                style={{ paddingRight: config.space.S200 }}
                placeholder="Type name..."
                variant="Surface"
                size="400"
                outlined
                radii="400"
                before={<Icon size="50" src={Icons.Search} />}
                after={
                  result && (
                    <Chip
                      variant={result.items.length > 0 ? 'Success' : 'Critical'}
                      size="400"
                      radii="Pill"
                      onClick={() => search('')}
                      after={<Icon size="50" src={Icons.Cross} />}
                    >
                      <Text size="B300">{`${result.items.length || 'No'} ${
                        result.items.length === 1 ? 'Result' : 'Results'
                      }`}</Text>
                    </Chip>
                  )
                }
              />
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
              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const tagOrMember = PLTagOrRoomMember[vItem.index];
                  if (!('userId' in tagOrMember)) {
                    return (
                      <Text
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${vItem.start}px)`,
                        }}
                        data-index={vItem.index}
                        ref={virtualizer.measureElement}
                        key={`${room.roomId}-${vItem.index}`}
                        className={css.MembersGroupLabel}
                        size="O400"
                      >
                        {tagOrMember.name}
                      </Text>
                    );
                  }

                  const member = tagOrMember;
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

            {members.length < room.getJoinedMemberCount() && (
              <Box justifyContent="Center">
                <Spinner />
              </Box>
            )}
          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}
