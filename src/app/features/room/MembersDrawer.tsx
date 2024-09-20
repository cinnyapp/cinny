import React, {
  ChangeEventHandler,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Avatar,
  Badge,
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
  RectCords,
  Scroll,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  config,
} from 'folds';
import { Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import classNames from 'classnames';

import { openProfileViewer } from '../../../client/action/navigation';
import * as css from './MembersDrawer.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Membership } from '../../../types/matrix/room';
import { UseStateProvider } from '../../components/UseStateProvider';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { usePowerLevelTags, PowerLevelTag } from '../../hooks/usePowerLevelTags';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName, getMemberSearchStr } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useSetSetting, useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { millify } from '../../plugins/millify';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { UserAvatar } from '../../components/user-avatar';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { stopPropagation } from '../../utils/keyboard';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

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
        color: 'Background',
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
        name: 'Newest',
        filterFn: SortFilters.filterNewestFirst,
      },
      {
        name: 'Oldest',
        filterFn: SortFilters.filterOldest,
      },
    ],
    []
  );

export type MembersFilterOptions = {
  membershipFilter: MembershipFilter;
  sortFilter: SortFilter;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 100,
  matchOptions: {
    contain: true,
  },
};

const mxIdToName = (mxId: string) => getMxIdLocalPart(mxId) ?? mxId;
const getRoomMemberStr: SearchItemStrGetter<RoomMember> = (m, query) =>
  getMemberSearchStr(m, query, mxIdToName);

type MembersDrawerProps = {
  room: Room;
  members: RoomMember[];
};
export function MembersDrawer({ room, members }: MembersDrawerProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
  const getPowerLevelTag = usePowerLevelTags();
  const fetchingMembers = members.length < room.getJoinedMemberCount();
  const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

  const membershipFilterMenu = useMembershipFilterMenu();
  const sortFilterMenu = useSortFilterMenu();
  const [sortFilterIndex, setSortFilterIndex] = useSetting(settingsAtom, 'memberSortFilterIndex');
  const [membershipFilterIndex, setMembershipFilterIndex] = useState(0);

  const membershipFilter = membershipFilterMenu[membershipFilterIndex] ?? membershipFilterMenu[0];
  const sortFilter = sortFilterMenu[sortFilterIndex] ?? sortFilterMenu[0];

  const typingMembers = useRoomTypingMember(room.roomId);

  const filteredMembers = useMemo(
    () =>
      members
        .filter(membershipFilter.filterFn)
        .sort(sortFilter.filterFn)
        .sort((a, b) => b.powerLevel - a.powerLevel),
    [members, membershipFilter, sortFilter]
  );

  const [result, search, resetSearch] = useAsyncSearch(
    filteredMembers,
    getRoomMemberStr,
    SEARCH_OPTIONS
  );
  if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

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

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
    useCallback(
      (evt) => {
        if (evt.target.value) search(evt.target.value);
        else resetSearch();
      },
      [search, resetSearch]
    ),
    { wait: 200 }
  );

  const getName = (member: RoomMember) =>
    getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

  const handleMemberClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const btn = evt.currentTarget as HTMLButtonElement;
    const userId = btn.getAttribute('data-user-id');
    openProfileViewer(userId, room.roomId);
  };

  return (
    <Box className={css.MembersDrawer} shrink="No" direction="Column">
      <Header className={css.MembersDrawerHeader} variant="Background" size="600">
        <Box grow="Yes" alignItems="Center" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text title={`${room.getJoinedMemberCount()} Members`} size="H5" truncate>
              {`${millify(room.getJoinedMemberCount())} Members`}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center">
            <TooltipProvider
              position="Bottom"
              align="End"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>Close</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton
                  ref={triggerRef}
                  variant="Background"
                  onClick={() => setPeopleDrawer(false)}
                >
                  <Icon src={Icons.Cross} />
                </IconButton>
              )}
            </TooltipProvider>
          </Box>
        </Box>
      </Header>
      <Box className={css.MemberDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover" hideTrack>
          <Box className={css.MemberDrawerContent} direction="Column" gap="200">
            <Box ref={scrollTopAnchorRef} className={css.DrawerGroup} direction="Column" gap="200">
              <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <UseStateProvider initial={undefined}>
                  {(anchor: RectCords | undefined, setAnchor) => (
                    <PopOut
                      anchor={anchor}
                      position="Bottom"
                      align="Start"
                      offset={4}
                      content={
                        <FocusTrap
                          focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: () => setAnchor(undefined),
                            clickOutsideDeactivates: true,
                            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                            escapeDeactivates: stopPropagation,
                          }}
                        >
                          <Menu style={{ padding: config.space.S100 }}>
                            {membershipFilterMenu.map((menuItem, index) => (
                              <MenuItem
                                key={menuItem.name}
                                variant={
                                  menuItem.name === membershipFilter.name
                                    ? menuItem.color
                                    : 'Surface'
                                }
                                aria-pressed={menuItem.name === membershipFilter.name}
                                size="300"
                                radii="300"
                                onClick={() => {
                                  setMembershipFilterIndex(index);
                                  setAnchor(undefined);
                                }}
                              >
                                <Text size="T300">{menuItem.name}</Text>
                              </MenuItem>
                            ))}
                          </Menu>
                        </FocusTrap>
                      }
                    >
                      <Chip
                        onClick={
                          ((evt) =>
                            setAnchor(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        variant={membershipFilter.color}
                        size="400"
                        radii="300"
                        before={<Icon src={Icons.Filter} size="50" />}
                      >
                        <Text size="T200">{membershipFilter.name}</Text>
                      </Chip>
                    </PopOut>
                  )}
                </UseStateProvider>
                <UseStateProvider initial={undefined}>
                  {(anchor: RectCords | undefined, setAnchor) => (
                    <PopOut
                      anchor={anchor}
                      position="Bottom"
                      align="End"
                      offset={4}
                      content={
                        <FocusTrap
                          focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: () => setAnchor(undefined),
                            clickOutsideDeactivates: true,
                            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                            escapeDeactivates: stopPropagation,
                          }}
                        >
                          <Menu style={{ padding: config.space.S100 }}>
                            {sortFilterMenu.map((menuItem, index) => (
                              <MenuItem
                                key={menuItem.name}
                                variant="Surface"
                                aria-pressed={menuItem.name === sortFilter.name}
                                size="300"
                                radii="300"
                                onClick={() => {
                                  setSortFilterIndex(index);
                                  setAnchor(undefined);
                                }}
                              >
                                <Text size="T300">{menuItem.name}</Text>
                              </MenuItem>
                            ))}
                          </Menu>
                        </FocusTrap>
                      }
                    >
                      <Chip
                        onClick={
                          ((evt) =>
                            setAnchor(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        variant="Background"
                        size="400"
                        radii="300"
                        after={<Icon src={Icons.Sort} size="50" />}
                      >
                        <Text size="T200">{sortFilter.name}</Text>
                      </Chip>
                    </PopOut>
                  )}
                </UseStateProvider>
              </Box>
              <Box direction="Column" gap="100">
                <Input
                  ref={searchInputRef}
                  onChange={handleSearchChange}
                  style={{ paddingRight: config.space.S200 }}
                  placeholder="Type name..."
                  variant="Surface"
                  size="400"
                  radii="400"
                  before={<Icon size="50" src={Icons.Search} />}
                  after={
                    result && (
                      <Chip
                        variant={result.items.length > 0 ? 'Success' : 'Critical'}
                        size="400"
                        radii="Pill"
                        aria-pressed
                        onClick={() => {
                          if (searchInputRef.current) {
                            searchInputRef.current.value = '';
                            searchInputRef.current.focus();
                          }
                          resetSearch();
                        }}
                        after={<Icon size="50" src={Icons.Cross} />}
                      >
                        <Text size="B300">{`${result.items.length || 'No'} ${result.items.length === 1 ? 'Result' : 'Results'
                          }`}</Text>
                      </Chip>
                    )
                  }
                />
              </Box>
            </Box>

            <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
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
            </ScrollTopContainer>

            {!fetchingMembers && !result && processMembers.length === 0 && (
              <Text style={{ padding: config.space.S300 }} align="Center">
                {`No "${membershipFilter.name}" Members`}
              </Text>
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
                          transform: `translateY(${vItem.start}px)`,
                        }}
                        data-index={vItem.index}
                        ref={virtualizer.measureElement}
                        key={`${room.roomId}-${vItem.index}`}
                        className={classNames(css.MembersGroupLabel, css.DrawerVirtualItem)}
                        size="L400"
                      >
                        {tagOrMember.name}
                      </Text>
                    );
                  }

                  const member = tagOrMember;
                  const name = getName(member);
                  const avatarMxcUrl = member.getMxcAvatarUrl();
                  const avatarUrl = avatarMxcUrl ? mx.mxcUrlToHttp(
                    avatarMxcUrl,
                    100,
                    100,
                    'crop',
                    undefined,
                    false,
                    useAuthentication
                  ) : undefined;

                  return (
                    <MenuItem
                      style={{
                        padding: `0 ${config.space.S200}`,
                        transform: `translateY(${vItem.start}px)`,
                      }}
                      data-index={vItem.index}
                      data-user-id={member.userId}
                      ref={virtualizer.measureElement}
                      key={`${room.roomId}-${member.userId}`}
                      className={css.DrawerVirtualItem}
                      variant="Background"
                      radii="400"
                      onClick={handleMemberClick}
                      before={
                        <Avatar size="200">
                          <UserAvatar
                            userId={member.userId}
                            src={avatarUrl ?? undefined}
                            alt={name}
                            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                          />
                        </Avatar>
                      }
                      after={
                        typingMembers.find((receipt) => receipt.userId === member.userId) && (
                          <Badge size="300" variant="Secondary" fill="Soft" radii="Pill" outlined>
                            <TypingIndicator size="300" />
                          </Badge>
                        )
                      }
                    >
                      <Box grow="Yes">
                        <Text size="T400" truncate>
                          {name}
                        </Text>
                      </Box>
                    </MenuItem>
                  );
                })}
              </div>
            </Box>

            {fetchingMembers && (
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
