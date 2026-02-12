import React, { RefObject, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Text,
  Box,
  Icon,
  Icons,
  config,
  Spinner,
  IconButton,
  Line,
  toRem,
  Button,
  Input,
  Switch,
  Avatar,
  Chip,
} from 'folds';
import { useAtomValue } from 'jotai';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SearchOrderBy } from 'matrix-js-sdk';
import { PageHero, PageHeroEmpty, PageHeroSection } from '../../components/page';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { _SearchPathSearchParams } from '../../pages/paths';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { SequenceCard } from '../../components/sequence-card';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { decodeSearchParamValueArray, encodeSearchParamValueArray } from '../../pages/pathUtils';
import { useRooms } from '../../state/hooks/roomList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { MessageSearchParams, useMessageSearch } from './useMessageSearch';
import { SearchResultGroup } from './SearchResultGroup';
import { SearchInput, type SearchInputHandle, type FilterKey } from './SearchInput';
import { SearchFilters } from './SearchFilters';
import { VirtualTile } from '../../components/virtualizer';
import {
  useLocalMessageSearch,
  useLocalSearchAvailable,
} from '../encrypted-search/hooks/useLocalMessageSearch';
import { UserAvatar } from '../../components/user-avatar';
import { mxcUrlToHttp } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import {
  parseSearchQuery,
  splitSearchTerms,
  highlightSearchTerms,
} from '../encrypted-search/search/searchQueryParser';
import { setSearchHighlightTarget } from '../../state/searchHighlight';

type FilterOptionType = 'user' | 'date' | 'month' | 'select' | 'boolean' | 'room';

type FilterOption = {
  key: FilterKey;
  label: string;
  description: string;
  type: FilterOptionType;
  options?: { value: string; label: string }[];
};

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'from', label: 'from:', description: 'utilisateur (ex: @alice:homeserver)', type: 'user' },
  { key: 'mentions', label: 'mentions:', description: 'utilisateur mentionné', type: 'user' },
  {
    key: 'has',
    label: 'has:',
    description: 'image, video, audio, file, link ou attachment',
    type: 'select',
    options: [
      { value: 'image', label: 'Image' },
      { value: 'video', label: 'Vidéo' },
      { value: 'audio', label: 'Audio' },
      { value: 'file', label: 'Fichier' },
      { value: 'link', label: 'Lien' },
      { value: 'attachment', label: 'Pièce jointe' },
    ],
  },
  { key: 'before', label: 'before:', description: 'date spécifique (YYYY-MM-DD)', type: 'date' },
  { key: 'after', label: 'after:', description: 'date spécifique (YYYY-MM-DD)', type: 'date' },
  { key: 'during', label: 'during:', description: 'année ou mois (YYYY ou YYYY-MM)', type: 'month' },
  { key: 'pinned', label: 'pinned:', description: 'true ou false', type: 'boolean' },
  { key: 'in', label: 'in:', description: 'salle spécifique', type: 'room' },
];

const DISCORD_LIKE_FILTERS = [
  { label: 'from:', description: 'utilisateur (ex: @alice:homeserver)' },
  { label: 'mentions:', description: 'utilisateur mentionné' },
  { label: 'has:', description: 'image, vidéo, audio, fichier, lien, attachment' },
  { label: 'before:', description: 'date (YYYY-MM-DD)' },
  { label: 'after:', description: 'date (YYYY-MM-DD)' },
  { label: 'during:', description: 'année ou mois (ex: 2024-01)' },
  { label: 'pinned:', description: 'true ou false' },
  { label: 'in:', description: 'salle spécifique (ID ou alias)' },
];

const useSearchPathSearchParams = (searchParams: URLSearchParams): _SearchPathSearchParams =>
  useMemo(
    () => ({
      global: searchParams.get('global') ?? undefined,
      term: searchParams.get('term') ?? undefined,
      order: searchParams.get('order') ?? undefined,
      rooms: searchParams.get('rooms') ?? undefined,
      senders: searchParams.get('senders') ?? undefined,
    }),
    [searchParams]
  );

type MessageSearchProps = {
  defaultRoomsFilterName: string;
  allowGlobal?: boolean;
  rooms: string[];
  senders?: string[];
  scrollRef: RefObject<HTMLDivElement>;
};
export function MessageSearch({
  defaultRoomsFilterName,
  allowGlobal,
  rooms,
  senders,
  scrollRef,
}: MessageSearchProps) {
  const mx = useMatrixClient();
  const mediaAuth = useMediaAuthentication();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const mDirects = useAtomValue(mDirectAtom);
  const allRooms = useRooms(mx, allRoomsAtom, mDirects);
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [legacyUsernameColor] = useSetting(settingsAtom, 'legacyUsernameColor');

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  const searchInputRef = useRef<SearchInputHandle>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchPathSearchParams = useSearchPathSearchParams(searchParams);
  const { navigateRoom } = useRoomNavigate();

  const searchParamRooms = useMemo(() => {
    if (searchPathSearchParams.rooms) {
      const joinedRoomIds = decodeSearchParamValueArray(searchPathSearchParams.rooms).filter(
        (rId) => allRooms.includes(rId)
      );
      return joinedRoomIds;
    }
    return undefined;
  }, [allRooms, searchPathSearchParams.rooms]);
  const searchParamsSenders = useMemo(() => {
    if (searchPathSearchParams.senders) {
      return decodeSearchParamValueArray(searchPathSearchParams.senders);
    }
    return undefined;
  }, [searchPathSearchParams.senders]);

  const msgSearchParams: MessageSearchParams = useMemo(() => {
    const isGlobal = searchPathSearchParams.global === 'true';
    const defaultRooms = isGlobal ? undefined : rooms;

    return {
      term: searchPathSearchParams.term,
      order: searchPathSearchParams.order ?? SearchOrderBy.Recent,
      rooms: searchParamRooms ?? defaultRooms,
      senders: searchParamsSenders ?? senders,
    };
  }, [searchPathSearchParams, searchParamRooms, searchParamsSenders, rooms, senders]);

  const structuredSearchQuery = useMemo(() => {
    if (!msgSearchParams.term) return null;
    try {
      return parseSearchQuery(msgSearchParams.term);
    } catch {
      return null;
    }
  }, [msgSearchParams.term]);

  const activeFilters = useMemo<Record<FilterKey, boolean>>(
    () => ({
      from: !!structuredSearchQuery?.from,
      mentions: !!structuredSearchQuery?.mentions,
      has: !!structuredSearchQuery?.has,
      before: !!structuredSearchQuery?.before,
      after: !!structuredSearchQuery?.after,
      during: structuredSearchQuery?.during !== undefined,
      pinned: structuredSearchQuery?.pinned !== undefined,
      in: !!structuredSearchQuery?.in,
    }),
    [structuredSearchQuery]
  );

  const searchMessages = useMessageSearch(msgSearchParams);
  const localSearchParams = useMemo(
    () => ({
      term: msgSearchParams.term,
      order: msgSearchParams.order === SearchOrderBy.Relevance ? 'relevance' : 'recent',
      rooms: msgSearchParams.rooms,
      senders: msgSearchParams.senders,
    }),
    [msgSearchParams]
  );
  const localSearchMessages = useLocalMessageSearch(localSearchParams);
  const localSearchAvailable = useLocalSearchAvailable();
  const preferLocal = localSearchAvailable;

  const roomOptions = useMemo(() => {
    return rooms.map((roomId) => {
      const room = mx.getRoom(roomId);
      return {
        value: roomId,
        label: room?.name ?? roomId,
      };
    });
  }, [mx, rooms]);

  const insertFilterSnippet = (snippet: string) => {
    searchInputRef.current?.insertSnippet(snippet);
  };

  const userOptions = useMemo(() => {
    const seen = new Map<
      string,
      {
        displayName: string;
        avatarUrl?: string;
      }
    >();
    rooms.forEach((roomId) => {
      const room = mx.getRoom(roomId);
      if (!room) return;
      const members = room.getJoinedMembers();
      members.forEach((member) => {
        if (!seen.has(member.userId)) {
          const displayName = member.name || member.userId;
          const avatarMxc = member.getMxcAvatarUrl?.();
          const avatarUrl = avatarMxc
            ? mxcUrlToHttp(mx, avatarMxc, mediaAuth, 48, 48, 'crop') ?? undefined
            : undefined;
          seen.set(member.userId, {
            displayName,
            avatarUrl,
          });
        }
      });
    });
    return Array.from(seen.entries()).map(([userId, { displayName, avatarUrl }]) => ({
      userId,
      displayName,
      avatarUrl,
    }));
  }, [mx, rooms, mediaAuth]);

  const {
    status: localStatus,
    data: localData,
    error: localError,
    fetchNextPage: fetchNextLocalPage,
    hasNextPage: localHasNextPage,
    isFetchingNextPage: localIsFetchingNextPage,
  } = useInfiniteQuery({
    enabled: preferLocal && !!msgSearchParams.term,
    queryKey: [
      'local-search',
      localSearchParams.term,
      localSearchParams.order,
      localSearchParams.rooms,
      localSearchParams.senders,
    ],
    queryFn: ({ pageParam = 0 }) => localSearchMessages(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && typeof lastPage.nextOffset === 'number'
        ? lastPage.nextOffset
        : undefined,
  });

  const localRawGroups = useMemo(
    () => localData?.pages.flatMap((result) => result.groups) ?? [],
    [localData]
  );
  const localGroups = useMemo(() => {
    return localRawGroups.map((group) => {
      const room = mx.getRoom(group.roomId);
      return {
        roomId: group.roomId,
        items: group.items.map((item) => {
          const storedContent = { ...item.content.content, body: item.content.body };
          const matrixEvent = room?.findEventById(item.entry.eventId);
          const liveEvent =
            matrixEvent?.getEffectiveEvent?.() ??
            matrixEvent?.event ??
            undefined;

          const baseEvent = {
            event_id: item.entry.eventId,
            room_id: item.entry.roomId,
            sender: item.entry.senderId,
            origin_server_ts: item.entry.timestamp,
            type: item.content.eventType,
            content: storedContent,
          };

          const event = liveEvent
            ? {
                ...liveEvent,
                event_id: baseEvent.event_id,
                room_id: baseEvent.room_id,
                sender: baseEvent.sender,
                origin_server_ts: baseEvent.origin_server_ts,
                type: item.content.eventType ?? liveEvent.type,
                content: liveEvent.content ?? storedContent,
              }
            : baseEvent;

          return {
            rank: item.score ?? 0,
            event,
            context: {
              events_after: [],
              events_before: [],
              profile_info: {},
            },
          };
        }),
      };
    });
  }, [localRawGroups, mx]);
  const localHighlights = useMemo(() => {
    const highlightSet = new Set<string>();
    if (structuredSearchQuery?.text) {
      splitSearchTerms(structuredSearchQuery.text)
        .filter((term) => term.trim().length > 0)
        .forEach((term) => highlightSet.add(term));
    }
    if (highlightSet.size === 0) {
      localRawGroups.forEach((group) => {
        group.items.forEach((item) => {
          const body = item.content.body;
          const snippet = item.content.attachments?.[0]?.name || body;
          if (snippet) {
            highlightSet.add(snippet);
          }
        });
      });
    }
    return Array.from(highlightSet);
  }, [localRawGroups, structuredSearchQuery]);

  const shouldFallbackToServer =
    preferLocal && !!msgSearchParams.term && !!localError;

  const {
    status: serverStatus,
    data: serverData,
    error: serverError,
    fetchNextPage: fetchNextServerPage,
    hasNextPage: serverHasNextPage,
    isFetchingNextPage: serverIsFetchingNextPage,
  } = useInfiniteQuery({
    enabled: (!preferLocal || shouldFallbackToServer) && !!msgSearchParams.term,
    queryKey: [
      'server-search',
      msgSearchParams.term,
      msgSearchParams.order,
      msgSearchParams.rooms,
      msgSearchParams.senders,
    ],
    queryFn: ({ pageParam = '' }) => searchMessages(pageParam),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });
  const serverGroups = useMemo(
    () => serverData?.pages.flatMap((result) => result.groups) ?? [],
    [serverData]
  );
  const serverHighlights = useMemo(() => {
    const mixed = serverData?.pages.flatMap((result) => result.highlights);
    return Array.from(new Set(mixed));
  }, [serverData]);

  const usingLocalResults = preferLocal && !shouldFallbackToServer;
  const activeMode: 'server' | 'local' = usingLocalResults ? 'local' : 'server';
  const fallbackNotice =
    preferLocal && shouldFallbackToServer
      ? localError instanceof Error
        ? `Local search failed: ${localError.message}. Showing server results.`
        : localError
        ? 'Local search failed. Showing server results.'
        : 'No local results found. Showing server results.'
      : null;
  const groups = usingLocalResults ? localGroups : serverGroups;
  const highlights = usingLocalResults ? localHighlights : serverHighlights;
  const status = usingLocalResults ? localStatus : serverStatus;
  const error = (usingLocalResults ? localError : serverError) as Error | null | undefined;
  const hasNextPage = usingLocalResults ? !!localHasNextPage : !!serverHasNextPage;
  const isFetchingNextPage = usingLocalResults
    ? localIsFetchingNextPage
    : serverIsFetchingNextPage;
  const fetchNextPage = usingLocalResults ? fetchNextLocalPage : fetchNextServerPage;

  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 1,
  });
  const vItems = virtualizer.getVirtualItems();

  const handleSearch = (term: string) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('term');
      newParams.append('term', term);
      return newParams;
    });
  };
  const handleSearchClear = () => {
    searchInputRef.current?.reset();
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('term');
      return newParams;
    });
  };

  const handleSelectedRoomsChange = (selectedRooms?: string[]) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('rooms');
      if (selectedRooms && selectedRooms.length > 0) {
        newParams.append('rooms', encodeSearchParamValueArray(selectedRooms));
      }
      return newParams;
    });
  };
  const handleGlobalChange = (global?: boolean) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('global');
      if (global) {
        newParams.append('global', 'true');
      }
      return newParams;
    });
  };

  const handleOrderChange = (order?: string) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('order');
      if (order) {
        newParams.append('order', order);
      }
      return newParams;
    });
  };

  const lastVItem = vItems[vItems.length - 1];
  const lastVItemIndex: number | undefined = lastVItem?.index;
  const lastGroupIndex = groups.length - 1;
  useEffect(() => {
    if (
      lastGroupIndex > -1 &&
      lastGroupIndex === lastVItemIndex &&
      !isFetchingNextPage &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastVItemIndex, lastGroupIndex, fetchNextPage, isFetchingNextPage, hasNextPage]);

  const handleResultOpen = useCallback(
    (roomId: string, eventId: string) => {
      if (usingLocalResults && eventId) {
        setSearchHighlightTarget(roomId, eventId);
      }
      navigateRoom(roomId, eventId);
    },
    [navigateRoom, usingLocalResults]
  );

  return (
    <Box direction="Column" gap="700">
      <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
        <IconButton
          onClick={() => virtualizer.scrollToOffset(0)}
          variant="SurfaceVariant"
          radii="Pill"
          outlined
          size="300"
          aria-label="Scroll to Top"
        >
          <Icon src={Icons.ChevronTop} size="300" />
        </IconButton>
      </ScrollTopContainer>
      <Box ref={scrollTopAnchorRef} direction="Column" gap="300">
        <SearchInput
          ref={searchInputRef}
          active={!!msgSearchParams.term}
          loading={!!msgSearchParams.term && status === 'pending'}
          initialValue={msgSearchParams.term ?? ''}
          onSearch={handleSearch}
          onReset={handleSearchClear}
        />
        {activeMode === 'server' && (
          <SearchFilters
            defaultRoomsFilterName={defaultRoomsFilterName}
            allowGlobal={allowGlobal}
            roomList={searchPathSearchParams.global === 'true' ? allRooms : rooms}
            selectedRooms={searchParamRooms}
            onSelectedRoomsChange={handleSelectedRoomsChange}
            global={searchPathSearchParams.global === 'true'}
            onGlobalChange={handleGlobalChange}
            order={msgSearchParams.order}
            onOrderChange={handleOrderChange}
          />
        )}
        {usingLocalResults && (
          <Box>
            <Button
              variant="Secondary"
              size="300"
              onClick={() => setFiltersOpen((prev) => !prev)}
              before={<Icon src={Icons.Filter} />}
            >
              {filtersOpen ? 'Masquer les filtres' : 'Filtres de recherche'}
            </Button>
          </Box>
        )}
        {usingLocalResults && filtersOpen && (
          <SearchFilterAssistant
            options={FILTER_OPTIONS}
            roomOptions={roomOptions}
            userOptions={userOptions}
            activeFilters={activeFilters}
            onInsert={insertFilterSnippet}
            onClose={() => setFiltersOpen(false)}
          />
        )}
        {fallbackNotice && (
          <Box
            alignItems="Center"
            gap="150"
            className={ContainerColor({ variant: 'SurfaceVariant' })}
            style={{ padding: config.space.S200, borderRadius: config.radii.R300 }}
          >
            <Icon size="200" src={Icons.Info} />
            <Text size="T300">{fallbackNotice}</Text>
          </Box>
        )}
      </Box>

      {!msgSearchParams.term && status === 'pending' && (
        <PageHeroEmpty>
          <PageHeroSection>
            <PageHero
              icon={<Icon size="600" src={Icons.Message} />}
              title="Search Messages"
              subTitle="Find helpful messages in your community by searching with related keywords."
            />
          </PageHeroSection>
        </PageHeroEmpty>
      )}

      {msgSearchParams.term && groups.length === 0 && status === 'success' && (
        <Box
          className={ContainerColor({ variant: 'Warning' })}
          style={{ padding: config.space.S300, borderRadius: config.radii.R400 }}
          alignItems="Center"
          gap="200"
        >
          <Icon size="200" src={Icons.Info} />
          <Text>
            No results found for <b>{`"${msgSearchParams.term}"`}</b>
          </Text>
        </Box>
      )}

      {((msgSearchParams.term && status === 'pending') ||
        (groups.length > 0 && vItems.length === 0)) && (
        <Box direction="Column" gap="100">
          {[...Array(8).keys()].map((key) => (
            <SequenceCard variant="SurfaceVariant" key={key} style={{ minHeight: toRem(80) }} />
          ))}
        </Box>
      )}

      {vItems.length > 0 && (
        <Box direction="Column" gap="300">
          <Box direction="Column" gap="200">
            <Text size="H5">{`Results for "${msgSearchParams.term}"`}</Text>
            <Line size="300" variant="Surface" />
          </Box>
          <div
            style={{
              position: 'relative',
              height: virtualizer.getTotalSize(),
            }}
          >
            {vItems.map((vItem) => {
              const group = groups[vItem.index];
              if (!group) return null;
              const groupRoom = mx.getRoom(group.roomId);
              if (!groupRoom) return null;

              return (
                <VirtualTile
                  virtualItem={vItem}
                  style={{ paddingBottom: config.space.S500 }}
                  ref={virtualizer.measureElement}
                  key={vItem.index}
                >
                  <SearchResultGroup
                    room={groupRoom}
                    highlights={highlights}
                    items={group.items}
                    mediaAutoLoad={mediaAutoLoad}
                    urlPreview={urlPreview}
                    onOpen={handleResultOpen}
                    legacyUsernameColor={legacyUsernameColor || mDirects.has(groupRoom.roomId)}
                    hour24Clock={hour24Clock}
                    dateFormatString={dateFormatString}
                  />
                </VirtualTile>
              );
            })}
          </div>
          {isFetchingNextPage && (
            <Box justifyContent="Center" alignItems="Center">
              <Spinner size="600" variant="Secondary" />
            </Box>
          )}
        </Box>
      )}

      {error && (
        <Box
          className={ContainerColor({ variant: 'Critical' })}
          style={{
            padding: config.space.S300,
            borderRadius: config.radii.R400,
          }}
          direction="Column"
          gap="200"
        >
          <Text size="L400">{error.name}</Text>
          <Text size="T300">{error.message}</Text>
        </Box>
      )}
    </Box>
  );
}

type UserOption = { userId: string; displayName: string; avatarUrl?: string };

type SearchFilterAssistantProps = {
  options: FilterOption[];
  roomOptions: { value: string; label: string }[];
  userOptions: UserOption[];
  activeFilters: Record<FilterKey, boolean>;
  onInsert: (snippet: string) => void;
  onClose?: () => void;
};

function SearchFilterAssistant({
  options,
  roomOptions,
  userOptions,
  activeFilters,
  onInsert,
  onClose,
}: SearchFilterAssistantProps) {
  const [active, setActive] = useState<FilterOption | null>(null);
  const [value, setValue] = useState('');
  const [showUserSuggestions, setShowUserSuggestions] = useState(true);
  const [showRoomSuggestions, setShowRoomSuggestions] = useState(true);

  const handleStart = (option: FilterOption) => {
    setActive(option);
    setShowUserSuggestions(true);
    setShowRoomSuggestions(true);
    if (option.type === 'boolean') {
      setValue('true');
    } else if (option.type === 'select') {
      setValue(option.options?.[0]?.value ?? '');
    } else if (option.type === 'room') {
      setValue('');
    } else {
      setValue('');
    }
  };

  const handleApply = () => {
    if (!active) return;
    if (active.type !== 'boolean' && !value) return;
    let finalValue = value.trim();
    if (active.type === 'user') {
      if (!finalValue.startsWith('@')) {
        const match = userOptions.find(
          (opt) =>
            opt.displayName.toLowerCase() === finalValue.toLowerCase() ||
            opt.userId.toLowerCase() === finalValue.toLowerCase()
        );
        if (match) {
          finalValue = match.userId;
        } else if (finalValue) {
          finalValue = finalValue.startsWith('@') ? finalValue : `@${finalValue}`;
        }
      }
    }
    if (active.type === 'room') {
      const match = roomOptions.find(
        (opt) =>
          opt.label.toLowerCase() === finalValue.toLowerCase() ||
          opt.value.toLowerCase() === finalValue.toLowerCase()
      );
      if (match) {
        finalValue = match.value;
      }
    }
    const snippet = `${active.key}:${finalValue}`;
    onInsert(snippet);
    onClose?.();
    setActive(null);
    setValue('');
  };

  const handleCancel = () => {
    setActive(null);
    setValue('');
  };

  const renderInput = () => {
    if (!active) return null;
    switch (active.type) {
      case 'user':
        return (
          <Box direction="Column" gap="100">
            <Input
              style={{ width: '300px' }}
              value={value}
              onChange={(evt) => {
                setValue(evt.currentTarget.value);
                setShowUserSuggestions(true);
              }}
              placeholder="@user:homeserver"
            />
            {!value.startsWith('@') &&
              userOptions.length > 0 &&
              value.length >= 2 &&
              showUserSuggestions && (
                <Box
                  direction="Column"
                  gap="0"
                  style={{
                    maxHeight: toRem(180),
                  overflowY: 'auto',
                  borderRadius: config.radii.R400,
                  border: `1px solid var(--bg-surface-border)`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
              >
                {userOptions
                  .filter((opt) => {
                    const q = value.toLowerCase();
                    return (
                      opt.displayName.toLowerCase().includes(q) ||
                      opt.userId.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 5)
                  .map((opt, index, arr) => (
                    <Button
                      key={opt.userId}
                      variant="Surface"
                      onClick={() => {
                        setValue(opt.displayName);
                        setShowUserSuggestions(false);
                      }}
                      style={{
                        width: '300px',
                        justifyContent: 'flex-start',
                        borderRadius: 0,
                        padding: `${config.space.S150} ${config.space.S200}`,
                        borderBottom:
                          index === arr.length - 1
                            ? 'none'
                            : '1px solid var(--bg-surface-border)',
                        position: 'relative',
                      }}
                    >
                      <Box alignItems="Center" gap="150" style={{ width: '100%', padding: '12px 16px' }}>
                        <Avatar size="200" radii="300">
                          <UserAvatar
                            userId={opt.userId}
                            src={opt.avatarUrl}
                            renderFallback={() => (
                              <Text size="T200">
                                {(opt.displayName || opt.userId).charAt(0).toUpperCase()}
                              </Text>
                            )}
                          />
                        </Avatar>
                        <Box direction="Column" alignItems="Start" gap="50" grow="Yes">
                          <Text size="T300">{opt.displayName}</Text>
                        </Box>
                      </Box>
                    </Button>
                  ))}
              </Box>
            )}
          </Box>
        );
      case 'date':
        return (
          <Input
            style={{ width: '300px' }}
            type="date"
            value={value}
            onChange={(evt) => setValue(evt.currentTarget.value)}
          />
        );
      case 'month':
        return (
          <Input
            style={{ width: '300px' }}
            type="month"
            value={value}
            onChange={(evt) => setValue(evt.currentTarget.value)}
          />
        );

      case 'select':
        return (
          <Box gap="100" alignItems="Center">
            <Chip variant="Surface" radii="R400" size="300" as="label" style={{ padding: '0' }}>
              <select
                value={value}
                onChange={(evt) => setValue(evt.currentTarget.value)}
                style={{
                  padding: `${config.space.S100} ${config.space.S150}`,
                  borderRadius: config.radii.R300,
                  border: '1px solid var(--bg-surface-border)',
                  background: 'var(--bg-surface)',
                  minWidth: '220px',
                }}
              >
                {active.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Chip>
          </Box>
        );
      case 'boolean':
        return (
          <Box alignItems="Center" gap="100">
            <Switch
              variant="Primary"
              value={value === 'true'}
              onChange={(checked) => setValue(checked ? 'true' : 'false')}
            />
            <Text style={{ width: '300px' }}>{value}</Text>
          </Box>
        );
      case 'room':
        return (
          <Box direction="Column" gap="100">
            <Input
              style={{ width: '300px' }}
              value={value}
              onChange={(evt) => {
                setValue(evt.currentTarget.value);
                setShowRoomSuggestions(true);
              }}
              placeholder="Nom de salle"
            />
            {value.length >= 2 && roomOptions.length > 0 && showRoomSuggestions && (
              <Box
                direction="Column"
                gap="0"
                style={{
                  maxHeight: toRem(180),
                  overflowY: 'auto',
                  borderRadius: config.radii.R400,
                  border: `1px solid var(--bg-surface-border)`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
              >
                {roomOptions
                  .filter((opt) => {
                    const q = value.toLowerCase();
                    return opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
                  })
                  .slice(0, 6)
                  .map((room, index, arr) => (
                    <Button
                      key={room.value}
                      variant="Surface"
                      onClick={() => {
                        setValue(room.label);
                        setShowRoomSuggestions(false);
                      }}
                      style={{
                        width: '300px',
                        justifyContent: 'flex-start',
                        borderRadius: 0,
                        padding: `${config.space.S150} ${config.space.S200}`,
                        borderBottom:
                          index === arr.length - 1
                            ? 'none'
                            : '1px solid var(--bg-surface-border)',
                      }}
                    >
                      <Text size="T300">{room.label}</Text>
                    </Button>
                  ))}
              </Box>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        padding: config.space.S300,
        backgroundColor: 'var(--bg-surface-low)',
        borderRadius: config.radii.R400,
      }}
    >
      <Text size="L400">Options de recherche</Text>
      {options.map((option) => {
        const isActive = active?.key === option.key;
        return (
          <Box
            key={option.key}
            direction="Column"
            gap="100"
            style={{
              padding: config.space.S200,
              borderRadius: config.radii.R300,
              backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
            }}
          >
            <Box justifyContent="SpaceBetween" alignItems="Center" gap="200">
              <Text size="T300" priority="300">
                <b>{option.label}</b> {option.description}
              </Text>
              {!isActive && (
                <IconButton
                  variant="Surface"
                  aria-label={`Ajouter ${option.label}`}
                  onClick={() => handleStart(option)}
                >
                  <Icon src={Icons.Plus} />
                </IconButton>
              )}
            </Box>
            {isActive && (
              <Box gap="200" alignItems="Center" style={{ flexWrap: 'wrap' }}>
                {renderInput()}
                <Button size="300" variant="Primary" onClick={handleApply}>
                  Ajouter
                </Button>
                <Button size="300" variant="Secondary" onClick={handleCancel}>
                  Annuler
                </Button>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
