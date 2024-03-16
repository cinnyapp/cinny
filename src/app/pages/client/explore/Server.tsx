import React, {
  FormEventHandler,
  MouseEventHandler,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Button,
  Chip,
  Icon,
  Icons,
  Input,
  Menu,
  PopOut,
  Scroll,
  Spinner,
  Text,
  config,
  toRem,
} from 'folds';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { useQuery } from '@tanstack/react-query';
import { MatrixClient, Method, RoomType } from 'matrix-js-sdk';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import { RoomCard, RoomCardBase, RoomCardGrid } from '../../../components/room-card';
import { ExploreServerPathSearchParams } from '../../paths';
import { getExploreServerPath, withSearchParam } from '../../pathUtils';
import * as css from './style.css';

const getServerSearchParams = (searchParams: URLSearchParams): ExploreServerPathSearchParams => ({
  limit: searchParams.get('limit') ?? undefined,
  since: searchParams.get('since') ?? undefined,
  term: searchParams.get('term') ?? undefined,
  type: searchParams.get('type') ?? undefined,
});

type RoomTypeFilter = {
  title: string;
  value: string | undefined;
};
const useRoomTypeFilters = (): RoomTypeFilter[] =>
  useMemo(
    () => [
      {
        title: 'All',
        value: undefined,
      },
      {
        title: 'Spaces',
        value: RoomType.Space,
      },
      {
        title: 'Rooms',
        value: 'null',
      },
    ],
    []
  );

const FALLBACK_ROOMS_LIMIT = 24;

type SearchProps = {
  active?: boolean;
  loading?: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  onSearch: (term: string) => void;
  onReset: () => void;
};
function Search({ active, loading, searchInputRef, onSearch, onReset }: SearchProps) {
  const handleSearchSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { searchInput } = evt.target as HTMLFormElement & {
      searchInput: HTMLInputElement;
    };

    const searchTerm = searchInput.value.trim() || undefined;
    if (searchTerm) {
      onSearch(searchTerm);
    }
  };

  return (
    <Box as="form" direction="Column" gap="100" onSubmit={handleSearchSubmit}>
      <span data-spacing-node />
      <Text size="L400">Search</Text>
      <Input
        ref={searchInputRef}
        style={{ paddingRight: config.space.S300 }}
        name="searchInput"
        size="500"
        variant="Background"
        placeholder="Search for keyword"
        before={
          active && loading ? (
            <Spinner variant="Secondary" size="200" />
          ) : (
            <Icon size="200" src={Icons.Search} />
          )
        }
        after={
          active ? (
            <Chip
              type="button"
              variant="Secondary"
              size="400"
              radii="Pill"
              outlined
              after={<Icon size="50" src={Icons.Cross} />}
              onClick={onReset}
            >
              <Text size="B300">Clear</Text>
            </Chip>
          ) : (
            <Chip type="submit" variant="Primary" size="400" radii="Pill" outlined>
              <Text size="B300">Enter</Text>
            </Chip>
          )
        }
      />
    </Box>
  );
}

type LimitButtonProps = {
  limit: number;
  onLimitChange: (limit: string) => void;
};
function LimitButton({ limit, onLimitChange }: LimitButtonProps) {
  const [openLimit, setOpenLimit] = useState(false);

  const handleLimitSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const limitInput = evt.currentTarget.limitInput as HTMLInputElement;
    if (!limitInput) return;
    const newLimit = limitInput.value.trim();
    if (!newLimit) return;
    onLimitChange(newLimit);
  };

  const setLimit = (l: string) => {
    setOpenLimit(false);
    onLimitChange(l);
  };

  return (
    <PopOut
      open={openLimit}
      align="End"
      position="Bottom"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setOpenLimit(false),
            clickOutsideDeactivates: true,
          }}
        >
          <Menu variant="Surface">
            <Box direction="Column" gap="400" style={{ padding: config.space.S300 }}>
              <Box direction="Column" gap="100">
                <Text size="L400">Presets</Text>
                <Box gap="100" wrap="Wrap">
                  <Chip variant="SurfaceVariant" onClick={() => setLimit('24')} radii="Pill">
                    <Text size="T200">24</Text>
                  </Chip>
                  <Chip variant="SurfaceVariant" onClick={() => setLimit('48')} radii="Pill">
                    <Text size="T200">48</Text>
                  </Chip>
                  <Chip variant="SurfaceVariant" onClick={() => setLimit('96')} radii="Pill">
                    <Text size="T200">96</Text>
                  </Chip>
                </Box>
              </Box>
              <Box as="form" onSubmit={handleLimitSubmit} direction="Column" gap="300">
                <Box direction="Column" gap="100">
                  <Text size="L400">Custom Limit</Text>
                  <Input
                    name="limitInput"
                    size="300"
                    variant="Background"
                    defaultValue={limit}
                    min={1}
                    step={1}
                    outlined
                    type="number"
                    radii="400"
                    aria-label="Per Page Item Limit"
                  />
                </Box>
                <Button type="submit" size="300" variant="Primary" radii="400">
                  <Text size="B300">Change Limit</Text>
                </Button>
              </Box>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {(anchorRef) => (
        <Chip
          ref={anchorRef}
          onClick={() => setOpenLimit(!openLimit)}
          aria-pressed={openLimit}
          radii="Pill"
          size="400"
          variant="SurfaceVariant"
          after={<Icon size="100" src={Icons.ChevronBottom} />}
        >
          <Text size="T200" truncate>{`Page Limit: ${limit}`}</Text>
        </Chip>
      )}
    </PopOut>
  );
}

export function PublicRooms() {
  const { server } = useParams();
  const mx = useMatrixClient();
  const [searchParams] = useSearchParams();
  const serverSearchParams = getServerSearchParams(searchParams);
  const isSearch = !!serverSearchParams.term;
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const roomTypeFilters = useRoomTypeFilters();

  const currentLimit: number = useMemo(() => {
    const limitParam = serverSearchParams.limit;
    if (!limitParam) return FALLBACK_ROOMS_LIMIT;
    return parseInt(limitParam, 10) || FALLBACK_ROOMS_LIMIT;
  }, [serverSearchParams.limit]);

  const resetScroll = useCallback(() => {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTop = 0;
  }, []);

  const fetchPublicRooms = useCallback(() => {
    const limit =
      typeof serverSearchParams.limit === 'string'
        ? parseInt(serverSearchParams.limit, 10)
        : FALLBACK_ROOMS_LIMIT;
    const roomType: string | null | undefined =
      serverSearchParams.type === 'null' ? null : serverSearchParams.type;

    return mx.http.authedRequest<Awaited<ReturnType<MatrixClient['publicRooms']>>>(
      Method.Post,
      '/publicRooms',
      {
        server,
      },
      {
        limit,
        since: serverSearchParams.since,
        filter: {
          generic_search_term: serverSearchParams.term,
          room_types: roomType !== undefined ? [roomType] : undefined,
        },
      }
    );
  }, [mx, server, serverSearchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      server,
      'publicRooms',
      serverSearchParams.limit,
      serverSearchParams.since,
      serverSearchParams.term,
      serverSearchParams.type,
    ],
    queryFn: fetchPublicRooms,
  });

  useEffect(() => {
    if (isLoading) resetScroll();
  }, [isLoading, resetScroll]);

  const explore = (newSearchParams: ExploreServerPathSearchParams) => {
    if (!server) return;

    const sParams: Record<string, string> = {
      ...serverSearchParams,
      ...newSearchParams,
    };
    Object.keys(sParams).forEach((key) => {
      if (sParams[key] === undefined) delete sParams[key];
    });
    const path = withSearchParam(getExploreServerPath(server), sParams);
    navigate(path);
  };

  const paginateBack = () => {
    const token = data?.prev_batch;
    explore({ since: token });
  };

  const paginateFront = () => {
    const token = data?.next_batch;
    explore({ since: token });
  };

  const handleSearch = (term: string) => {
    explore({
      term,
      since: undefined,
    });
  };

  const handleSearchClear = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    explore({
      term: undefined,
      since: undefined,
    });
  };

  const handleRoomFilterClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const filter = evt.currentTarget.getAttribute('data-room-filter');
    explore({
      type: filter ?? undefined,
      since: undefined,
    });
  };

  const handleLimitChange = (limit: string) => {
    explore({ limit });
  };

  return (
    <Page>
      <PageHeader>
        {isSearch ? (
          <>
            <Box grow="Yes" basis="No">
              <Chip
                size="500"
                variant="Surface"
                radii="Pill"
                before={<Icon size="100" src={Icons.ArrowLeft} />}
                onClick={handleSearchClear}
              >
                <Text size="T300">{server}</Text>
              </Chip>
            </Box>

            <Box grow="No" justifyContent="Center" alignItems="Center" gap="200">
              <Icon size="400" src={Icons.Search} />
              <Text size="H3" truncate>
                Search
              </Text>
            </Box>
            <Box grow="Yes" />
          </>
        ) : (
          <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
            <Icon size="400" src={Icons.Category} />
            <Text size="H3" truncate>
              {server}
            </Text>
          </Box>
        )}
      </PageHeader>
      <Box grow="Yes">
        <Scroll ref={scrollRef} hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <Box direction="Column" gap="600">
                <Search
                  key={server}
                  active={isSearch}
                  loading={isLoading}
                  searchInputRef={searchInputRef}
                  onSearch={handleSearch}
                  onReset={handleSearchClear}
                />
                <Box direction="Column" gap="400">
                  <Box direction="Column" gap="300">
                    {isSearch ? (
                      <Text size="H4">{`Results for "${serverSearchParams.term}"`}</Text>
                    ) : (
                      <Text size="H4">Popular Communities</Text>
                    )}
                    <Box gap="200">
                      {roomTypeFilters.map((filter) => (
                        <Chip
                          key={filter.title}
                          onClick={handleRoomFilterClick}
                          data-room-filter={filter.value}
                          variant={filter.value === serverSearchParams.type ? 'Success' : 'Surface'}
                          aria-pressed={filter.value === serverSearchParams.type}
                          before={
                            filter.value === serverSearchParams.type && (
                              <Icon size="100" src={Icons.Check} />
                            )
                          }
                          outlined
                        >
                          <Text size="T200">{filter.title}</Text>
                        </Chip>
                      ))}
                      <Box grow="Yes" data-spacing-node />
                      <LimitButton limit={currentLimit} onLimitChange={handleLimitChange} />
                    </Box>
                  </Box>
                  {isLoading && (
                    <RoomCardGrid>
                      {[...Array(currentLimit).keys()].map((item) => (
                        <RoomCardBase key={item} style={{ minHeight: toRem(260) }} />
                      ))}
                    </RoomCardGrid>
                  )}
                  {error && (
                    <Box direction="Column" className={css.PublicRoomsError} gap="200">
                      <Text size="L400">{error.name}</Text>
                      <Text size="T300">{error.message}</Text>
                    </Box>
                  )}
                  {data &&
                    (data.chunk.length > 0 ? (
                      <>
                        <RoomCardGrid>
                          {data?.chunk.map((chunkRoom) => (
                            <RoomCard
                              key={chunkRoom.room_id}
                              roomIdOrAlias={chunkRoom.canonical_alias ?? chunkRoom.room_id}
                              joinedRoomId={mx.getRoom(chunkRoom.room_id)?.roomId}
                              avatarUrl={chunkRoom.avatar_url}
                              name={chunkRoom.name}
                              topic={chunkRoom.topic}
                              memberCount={chunkRoom.num_joined_members}
                              roomType={chunkRoom.room_type}
                              renderTopicViewer={(name, topic, requestClose) => (
                                <RoomTopicViewer
                                  name={name}
                                  topic={topic}
                                  requestClose={requestClose}
                                />
                              )}
                            />
                          ))}
                        </RoomCardGrid>

                        {(data.prev_batch || data.next_batch) && (
                          <Box justifyContent="Center" gap="200">
                            <Button
                              onClick={paginateBack}
                              size="300"
                              fill="Soft"
                              disabled={!data.prev_batch}
                            >
                              <Text size="B300" truncate>
                                Previous Page
                              </Text>
                            </Button>
                            <Box data-spacing-node grow="Yes" />
                            <Button
                              onClick={paginateFront}
                              size="300"
                              fill="Solid"
                              disabled={!data.next_batch}
                            >
                              <Text size="B300" truncate>
                                Next Page
                              </Text>
                            </Button>
                          </Box>
                        )}
                      </>
                    ) : (
                      <Box
                        className={css.PublicRoomsInfo}
                        direction="Column"
                        justifyContent="Center"
                        alignItems="Center"
                        gap="200"
                      >
                        <Icon size="400" src={Icons.Info} />
                        <Text size="T300">No communities found!</Text>
                      </Box>
                    ))}
                </Box>
              </Box>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
