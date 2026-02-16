import React, {
  ChangeEventHandler,
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Chip,
  config,
  Icon,
  IconButton,
  Icons,
  Input,
  PopOut,
  RectCords,
  Scroll,
  Spinner,
  Text,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RoomMember } from 'matrix-js-sdk';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomMembers } from '../../../hooks/useRoomMembers';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useGetMemberPowerLevel, usePowerLevels } from '../../../hooks/usePowerLevels';
import { VirtualTile } from '../../../components/virtualizer';
import { MemberTile } from '../../../components/member-tile';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { getMxIdLocalPart, getMxIdServer } from '../../../utils/matrix';
import { ServerBadge } from '../../../components/server-badge';
import { useDebounce } from '../../../hooks/useDebounce';
import {
  SearchItemStrGetter,
  useAsyncSearch,
  UseAsyncSearchOptions,
} from '../../../hooks/useAsyncSearch';
import { getMemberSearchStr } from '../../../utils/room';
import { useMembershipFilter, useMembershipFilterMenu } from '../../../hooks/useMemberFilter';
import { useMemberPowerSort, useMemberSort, useMemberSortMenu } from '../../../hooks/useMemberSort';
import { settingsAtom } from '../../../state/settings';
import { useSetting } from '../../../state/hooks/settings';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { MembershipFilterMenu } from '../../../components/MembershipFilterMenu';
import { MemberSortMenu } from '../../../components/MemberSortMenu';
import { ScrollTopContainer } from '../../../components/scroll-top-container';
import {
  useOpenUserRoomProfile,
  useUserRoomProfileState,
} from '../../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../../hooks/useSpace';
import { useFlattenPowerTagMembers, useGetMemberPowerTag } from '../../../hooks/useMemberPowerTag';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { getMouseEventCords } from '../../../utils/dom';

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
  normalizeOptions: {
    ignoreWhitespace: false,
  },
};

const mxIdToName = (mxId: string) => getMxIdLocalPart(mxId) ?? mxId;
const getRoomMemberStr: SearchItemStrGetter<RoomMember> = (m, query) =>
  getMemberSearchStr(m, query, mxIdToName);

type MembersProps = {
  requestClose: () => void;
};
export function Members({ requestClose }: MembersProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const room = useRoom();
  const members = useRoomMembers(mx, room.roomId);
  const fetchingMembers = members.length < room.getJoinedMemberCount();
  const openProfile = useOpenUserRoomProfile();
  const profileUser = useUserRoomProfileState();
  const space = useSpaceOptionally();

  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);
  const getPowerTag = useGetMemberPowerTag(room, creators, powerLevels);
  const getPowerLevel = useGetMemberPowerLevel(powerLevels);

  const [membershipFilterIndex, setMembershipFilterIndex] = useState(0);
  const [sortFilterIndex, setSortFilterIndex] = useSetting(settingsAtom, 'memberSortFilterIndex');
  const membershipFilter = useMembershipFilter(membershipFilterIndex, useMembershipFilterMenu());
  const memberSort = useMemberSort(sortFilterIndex, useMemberSortMenu());
  const memberPowerSort = useMemberPowerSort(creators, getPowerLevel);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);

  const sortedMembers = useMemo(
    () =>
      Array.from(members)
        .filter(membershipFilter.filterFn)
        .sort(memberSort.sortFn)
        .sort(memberPowerSort),
    [members, membershipFilter, memberSort, memberPowerSort]
  );

  const [result, search, resetSearch] = useAsyncSearch(
    sortedMembers,
    getRoomMemberStr,
    SEARCH_OPTIONS
  );
  if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

  const flattenTagMembers = useFlattenPowerTagMembers(result?.items ?? sortedMembers, getPowerTag);

  const virtualizer = useVirtualizer({
    count: flattenTagMembers.length,
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

  const handleSearchReset = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.focus();
    }
    resetSearch();
  };

  const handleMemberClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const btn = evt.currentTarget as HTMLButtonElement;
    const userId = btn.getAttribute('data-user-id');
    if (userId) {
      openProfile(room.roomId, space?.roomId, userId, getMouseEventCords(evt.nativeEvent));
    }
  };

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {room.getJoinedMemberCount()} Members
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes" style={{ position: 'relative' }}>
        <Scroll ref={scrollRef} hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="200">
              <Box
                style={{ position: 'sticky', top: config.space.S100, zIndex: 1 }}
                direction="Column"
                gap="100"
              >
                <Input
                  ref={searchInputRef}
                  onChange={handleSearchChange}
                  before={<Icon size="200" src={Icons.Search} />}
                  variant="SurfaceVariant"
                  size="500"
                  placeholder="Search"
                  outlined
                  after={
                    result && (
                      <Chip
                        variant={result.items.length > 0 ? 'Success' : 'Critical'}
                        outlined
                        size="400"
                        radii="Pill"
                        aria-pressed
                        onClick={handleSearchReset}
                        after={<Icon size="50" src={Icons.Cross} />}
                      >
                        <Text size="B300">
                          {result.items.length === 0
                            ? 'No Results'
                            : `${result.items.length} Results`}
                        </Text>
                      </Chip>
                    )
                  }
                />
              </Box>
              <Box ref={scrollTopAnchorRef} alignItems="Center" justifyContent="End" gap="200">
                <UseStateProvider initial={undefined}>
                  {(anchor: RectCords | undefined, setAnchor) => (
                    <PopOut
                      anchor={anchor}
                      position="Bottom"
                      align="Start"
                      offset={4}
                      content={
                        <MembershipFilterMenu
                          selected={membershipFilterIndex}
                          onSelect={setMembershipFilterIndex}
                          requestClose={() => setAnchor(undefined)}
                        />
                      }
                    >
                      <Chip
                        onClick={
                          ((evt) =>
                            setAnchor(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        variant="SurfaceVariant"
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
                        <MemberSortMenu
                          selected={sortFilterIndex}
                          onSelect={setSortFilterIndex}
                          requestClose={() => setAnchor(undefined)}
                        />
                      }
                    >
                      <Chip
                        onClick={
                          ((evt) =>
                            setAnchor(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        variant="SurfaceVariant"
                        size="400"
                        radii="300"
                        after={<Icon src={Icons.Sort} size="50" />}
                      >
                        <Text size="T200">{memberSort.name}</Text>
                      </Chip>
                    </PopOut>
                  )}
                </UseStateProvider>
              </Box>
              <ScrollTopContainer
                style={{ top: toRem(64) }}
                scrollRef={scrollRef}
                anchorRef={scrollTopAnchorRef}
              >
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
              {fetchingMembers && (
                <Box justifyContent="Center">
                  <Spinner />
                </Box>
              )}

              {!fetchingMembers && !result && flattenTagMembers.length === 0 && (
                <Text style={{ padding: config.space.S300 }} align="Center">
                  {`No "${membershipFilter.name}" Members`}
                </Text>
              )}

              <Box
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
                direction="Column"
                gap="100"
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const tagOrMember = flattenTagMembers[vItem.index];

                  if ('userId' in tagOrMember) {
                    const server = getMxIdServer(tagOrMember.userId);
                    return (
                      <VirtualTile
                        virtualItem={vItem}
                        key={`${tagOrMember.userId}-${vItem.index}`}
                        ref={virtualizer.measureElement}
                      >
                        <div style={{ paddingTop: config.space.S200 }}>
                          <MemberTile
                            data-user-id={tagOrMember.userId}
                            onClick={handleMemberClick}
                            aria-pressed={profileUser?.userId === tagOrMember.userId}
                            mx={mx}
                            room={room}
                            member={tagOrMember}
                            useAuthentication={useAuthentication}
                            after={
                              server && (
                                <Box as="span" shrink="No" alignSelf="End">
                                  <ServerBadge server={server} fill="None" />
                                </Box>
                              )
                            }
                          />
                        </div>
                      </VirtualTile>
                    );
                  }

                  return (
                    <VirtualTile
                      virtualItem={vItem}
                      key={vItem.index}
                      ref={virtualizer.measureElement}
                    >
                      <div
                        style={{
                          paddingTop: vItem.index === 0 ? 0 : config.space.S500,
                        }}
                      >
                        <Text size="L400">{tagOrMember.name}</Text>
                      </div>
                    </VirtualTile>
                  );
                })}
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
