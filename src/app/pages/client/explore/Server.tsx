import React, { FormEventHandler, useCallback } from 'react';
import { Box, Button, Chip, Icon, Icons, Input, Text } from 'folds';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MatrixClient, Method, RoomType } from 'matrix-js-sdk';
import { Content, ContentHeroSection, ContentHero, ContentBody } from '../../../components/content';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import { RoomCard, RoomCardGrid } from '../../../components/room-card';
import { ExploreServerPathSearchParams } from '../../paths';
import { getExploreServerPath, withSearchParam } from '../../pathUtils';

const getServerSearchParams = (searchParams: URLSearchParams): ExploreServerPathSearchParams => ({
  limit: searchParams.get('limit') ?? undefined,
  since: searchParams.get('since') ?? undefined,
  term: searchParams.get('term') ?? undefined,
  type: searchParams.get('type') ?? undefined,
});

const FALLBACK_ROOMS_LIMIT = 24;

export function PublicRooms() {
  const { server } = useParams();
  const mx = useMatrixClient();
  const [searchParams] = useSearchParams();
  const serverSearchParams = getServerSearchParams(searchParams);
  const navigate = useNavigate();

  const fetchPublicRooms = useCallback(() => {
    const limit =
      typeof serverSearchParams.limit === 'string'
        ? parseInt(serverSearchParams.limit, 10)
        : FALLBACK_ROOMS_LIMIT;
    const roomType = serverSearchParams.type as RoomType | undefined;

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
          room_types: roomType ? [roomType] : undefined,
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

  const handleSearchSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { searchInput } = evt.target as HTMLFormElement & {
      searchInput: HTMLInputElement;
    };

    const searchTerm = searchInput.value.trim() || undefined;
    explore({
      term: searchTerm,
      since: undefined,
    });
  };

  // const filterRoomType: MouseEvent<HTMLButtonElement> = (evt) => {
  //   evt
  // }

  return (
    <Content>
      <Box direction="Column" gap="200">
        <ContentHeroSection direction="Column" gap="400">
          <ContentHero
            icon={<Icon size="600" src={Icons.Category} />}
            title={server}
            subTitle={`Find and explore public rooms and spaces on ${server} server.`}
          />
          <form onSubmit={handleSearchSubmit}>
            <Input
              name="searchInput"
              size="500"
              variant="Background"
              placeholder="Search"
              after={<Icon size="200" src={Icons.Search} />}
            />
          </form>
        </ContentHeroSection>
        <ContentBody>
          <Box direction="Column" gap="700">
            <Box direction="Column" gap="400">
              <Box direction="Column" gap="300">
                <Text size="H4">Public Community</Text>
                <Box gap="200">
                  <Chip
                    variant="Success"
                    aria-pressed
                    before={<Icon size="100" src={Icons.Check} />}
                    outlined
                  >
                    <Text size="T200">All</Text>
                  </Chip>
                  <Chip variant="Surface" outlined>
                    <Text size="T200">Spaces</Text>
                  </Chip>
                  <Chip variant="Surface" outlined>
                    <Text size="T200">Rooms</Text>
                  </Chip>
                </Box>
              </Box>
              {isLoading && !error && <Text>loading...</Text>}
              {error && <Text>{error.message}</Text>}
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
                    renderTopicViewer={(name, topic, requestClose) => (
                      <RoomTopicViewer name={name} topic={topic} requestClose={requestClose} />
                    )}
                  />
                ))}
              </RoomCardGrid>
              {data && (
                <>
                  <span data-spacing-node />
                  <Box justifyContent="Center" gap="200">
                    <Chip radii="Pill" size="500" variant="SurfaceVariant">
                      <Text size="B300" truncate>{`Page Limit: ${data.chunk.length}`}</Text>
                    </Chip>
                    <Box data-spacing-node grow="Yes" />
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
                </>
              )}
            </Box>
          </Box>
        </ContentBody>
      </Box>
    </Content>
  );
}
