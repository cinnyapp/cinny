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
  IconButton,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Spinner,
  Text,
  config,
  toRem,
} from 'folds';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { MatrixClient, Method, RoomType } from 'matrix-js-sdk';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import { RoomCard, RoomCardBase, RoomCardGrid } from '../../../components/room-card';
import { ExploreServerPathSearchParams } from '../../paths';
import { getExploreServerPath, withSearchParam } from '../../pathUtils';
import * as css from './style.css';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { getMxIdServer } from '../../../utils/matrix';
import { stopPropagation } from '../../../utils/keyboard';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';

const useServerSearchParams = (searchParams: URLSearchParams): ExploreServerPathSearchParams =>
  useMemo(
    () => ({
      limit: searchParams.get('limit') ?? undefined,
      since: searchParams.get('since') ?? undefined,
      term: searchParams.get('term') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      instance: searchParams.get('instance') ?? undefined,
    }),
    [searchParams]
  );

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

const DEFAULT_INSTANCE_NAME = 'Matrix';
function ThirdPartyProtocolsSelector({
  instanceId,
  onChange,
}: {
  instanceId?: string;
  onChange: (instanceId?: string) => void;
}) {
  const mx = useMatrixClient();
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const { data } = useQuery({
    queryKey: ['thirdparty', 'protocols'],
    queryFn: () => mx.getThirdpartyProtocols(),
  });

  const handleInstanceSelect: MouseEventHandler<HTMLButtonElement> = (evt): void => {
    const insId = evt.currentTarget.getAttribute('data-instance-id') ?? undefined;
    onChange(insId);
    setMenuAnchor(undefined);
  };

  const handleOpenMenu: MouseEventHandler<HTMLElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const instances = data && Object.keys(data).flatMap((protocol) => data[protocol].instances);
  if (!instances || instances.length === 0) return null;
  const selectedInstance = instances.find((instance) => instanceId === instance.instance_id);

  return (
    <PopOut
      anchor={menuAnchor}
      align="End"
      position="Bottom"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setMenuAnchor(undefined),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu variant="Surface">
            <Box
              direction="Column"
              gap="100"
              style={{ padding: config.space.S100, minWidth: toRem(100) }}
            >
              <Text style={{ padding: config.space.S100 }} size="L400" truncate>
                Protocols
              </Text>
              <Box direction="Column">
                <MenuItem
                  size="300"
                  variant="Surface"
                  aria-pressed={instanceId === undefined}
                  radii="300"
                  onClick={handleInstanceSelect}
                >
                  <Text size="T200" truncate>
                    {DEFAULT_INSTANCE_NAME}
                  </Text>
                </MenuItem>
                {instances.map((instance) => (
                  <MenuItem
                    size="300"
                    key={instance.instance_id}
                    data-instance-id={instance.instance_id}
                    aria-pressed={instanceId === instance.instance_id}
                    variant="Surface"
                    radii="300"
                    onClick={handleInstanceSelect}
                  >
                    <Text size="T200" truncate>
                      {instance.desc}
                    </Text>
                  </MenuItem>
                ))}
              </Box>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        onClick={handleOpenMenu}
        aria-pressed={!!menuAnchor}
        radii="Pill"
        size="400"
        variant={instanceId ? 'Success' : 'SurfaceVariant'}
        after={<Icon size="100" src={Icons.ChevronBottom} />}
      >
        <Text size="T200" truncate>
          {selectedInstance?.desc ?? DEFAULT_INSTANCE_NAME}
        </Text>
      </Chip>
    </PopOut>
  );
}

type LimitButtonProps = {
  limit: number;
  onLimitChange: (limit: string) => void;
};
function LimitButton({ limit, onLimitChange }: LimitButtonProps) {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleLimitSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const limitInput = evt.currentTarget.limitInput as HTMLInputElement;
    if (!limitInput) return;
    const newLimit = limitInput.value.trim();
    if (!newLimit) return;
    onLimitChange(newLimit);
  };

  const setLimit = (l: string) => {
    setMenuAnchor(undefined);
    onLimitChange(l);
  };
  const handleOpenMenu: MouseEventHandler<HTMLElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <PopOut
      anchor={menuAnchor}
      align="End"
      position="Bottom"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setMenuAnchor(undefined),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
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
      <Chip
        onClick={handleOpenMenu}
        aria-pressed={!!menuAnchor}
        radii="Pill"
        size="400"
        variant="SurfaceVariant"
        after={<Icon size="100" src={Icons.ChevronBottom} />}
      >
        <Text size="T200" truncate>{`Page Limit: ${limit}`}</Text>
      </Chip>
    </PopOut>
  );
}

export function PublicRooms() {
  const { server } = useParams();
  const mx = useMatrixClient();
  const userId = mx.getUserId();
  const userServer = userId && getMxIdServer(userId);
  const allRooms = useAtomValue(allRoomsAtom);
  const { navigateSpace, navigateRoom } = useRoomNavigate();
  const screenSize = useScreenSizeContext();

  const [searchParams] = useSearchParams();
  const serverSearchParams = useServerSearchParams(searchParams);
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
        third_party_instance_id: serverSearchParams.instance,
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
      serverSearchParams.instance,
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

  const handleInstanceIdChange = (instanceId?: string) => {
    explore({ instance: instanceId, since: undefined });
  };

  return (
    <Page>
      <PageHeader balance>
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
              {screenSize !== ScreenSize.Mobile && <Icon size="400" src={Icons.Search} />}
              <Text size="H3" truncate>
                Search
              </Text>
            </Box>
            <Box grow="Yes" basis="No" />
          </>
        ) : (
          <>
            <Box grow="Yes" basis="No">
              {screenSize === ScreenSize.Mobile && (
                <BackRouteHandler>
                  {(onBack) => (
                    <IconButton onClick={onBack}>
                      <Icon src={Icons.ArrowLeft} />
                    </IconButton>
                  )}
                </BackRouteHandler>
              )}
            </Box>
            <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
              {screenSize !== ScreenSize.Mobile && <Icon size="400" src={Icons.Category} />}
              <Text size="H3" truncate>
                {server}
              </Text>
            </Box>
            <Box grow="Yes" basis="No" />
          </>
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
                      {userServer === server && (
                        <>
                          <Line
                            style={{ margin: `${config.space.S100} 0` }}
                            direction="Vertical"
                            variant="Surface"
                            size="300"
                          />
                          <ThirdPartyProtocolsSelector
                            instanceId={serverSearchParams.instance}
                            onChange={handleInstanceIdChange}
                          />
                        </>
                      )}
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
                              allRooms={allRooms}
                              avatarUrl={chunkRoom.avatar_url}
                              name={chunkRoom.name}
                              topic={chunkRoom.topic}
                              memberCount={chunkRoom.num_joined_members}
                              roomType={chunkRoom.room_type}
                              onView={
                                chunkRoom.room_type === RoomType.Space
                                  ? navigateSpace
                                  : navigateRoom
                              }
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
                        className={css.RoomsInfoCard}
                        direction="Column"
                        justifyContent="Center"
                        alignItems="Center"
                        gap="200"
                      >
                        <Icon size="400" src={Icons.Info} />
                        <Text size="T300" align="Center">
                          No communities found!
                        </Text>
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
