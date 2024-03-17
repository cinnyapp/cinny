import React, { useCallback } from 'react';
import { Box, Icon, Icons, Scroll, Text } from 'folds';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { RoomCard, RoomCardGrid } from '../../../components/room-card';
import {
  getCanonicalAliasOrRoomId,
  getCanonicalAliasRoomId,
  isRoomAlias,
} from '../../../utils/matrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { RoomSummaryLoader } from '../../../components/RoomSummaryLoader';
import {
  Page,
  PageContent,
  PageContentCenter,
  PageHero,
  PageHeroSection,
} from '../../../components/page';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import { getHomeRoomPath, getSpacePath, getSpaceRoomPath } from '../../pathUtils';
import { getOrphanParents } from '../../../utils/room';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import * as css from './style.css';

export function FeaturedRooms() {
  const mx = useMatrixClient();
  const { featuredCommunities } = useClientConfig();
  const { rooms, spaces } = featuredCommunities ?? {};
  const allRooms = useAtomValue(allRoomsAtom);
  const navigate = useNavigate();
  const roomToParents = useAtomValue(roomToParentsAtom);

  const joinedRoomId = useCallback(
    (roomIdOrAlias: string): string | undefined => {
      const roomId = isRoomAlias(roomIdOrAlias)
        ? getCanonicalAliasRoomId(mx, roomIdOrAlias)
        : roomIdOrAlias;

      if (roomId && allRooms.includes(roomId)) return roomId;
      return undefined;
    },
    [mx, allRooms]
  );

  const navigateSpace = useCallback(
    (roomId: string) => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);
      navigate(getSpacePath(roomIdOrAlias));
    },
    [mx, navigate]
  );

  const navigateRoom = useCallback(
    (roomId: string) => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);

      const orphanParents = getOrphanParents(roomToParents, roomId);
      if (orphanParents.length > 0) {
        const pSpaceIdOrAlias = getCanonicalAliasOrRoomId(mx, orphanParents[0]);
        navigate(getSpaceRoomPath(pSpaceIdOrAlias, roomIdOrAlias));
        return;
      }

      navigate(getHomeRoomPath(roomIdOrAlias));
    },
    [mx, navigate, roomToParents]
  );

  return (
    <Page>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <Box direction="Column" gap="200">
                <PageHeroSection>
                  <PageHero
                    icon={<Icon size="600" src={Icons.Bulb} />}
                    title="Featured by Client"
                    subTitle="Find and explore public rooms and spaces featured by client provider."
                  />
                </PageHeroSection>
                <Box direction="Column" gap="700">
                  {spaces && spaces.length > 0 && (
                    <Box direction="Column" gap="400">
                      <Text size="H4">Featured Spaces</Text>
                      <RoomCardGrid>
                        {spaces.map((roomIdOrAlias) => (
                          <RoomSummaryLoader key={roomIdOrAlias} roomIdOrAlias={roomIdOrAlias}>
                            {(roomSummary) => (
                              <RoomCard
                                roomIdOrAlias={roomIdOrAlias}
                                joinedRoomId={joinedRoomId(roomIdOrAlias)}
                                avatarUrl={roomSummary?.avatar_url}
                                name={roomSummary?.name}
                                topic={roomSummary?.topic}
                                memberCount={roomSummary?.num_joined_members}
                                onView={navigateSpace}
                                renderTopicViewer={(name, topic, requestClose) => (
                                  <RoomTopicViewer
                                    name={name}
                                    topic={topic}
                                    requestClose={requestClose}
                                  />
                                )}
                              />
                            )}
                          </RoomSummaryLoader>
                        ))}
                      </RoomCardGrid>
                    </Box>
                  )}
                  {rooms && rooms.length > 0 && (
                    <Box direction="Column" gap="400">
                      <Text size="H4">Featured Rooms</Text>
                      <RoomCardGrid>
                        {rooms.map((roomIdOrAlias) => (
                          <RoomSummaryLoader key={roomIdOrAlias} roomIdOrAlias={roomIdOrAlias}>
                            {(roomSummary) => (
                              <RoomCard
                                roomIdOrAlias={roomIdOrAlias}
                                joinedRoomId={joinedRoomId(roomIdOrAlias)}
                                avatarUrl={roomSummary?.avatar_url}
                                name={roomSummary?.name}
                                topic={roomSummary?.topic}
                                memberCount={roomSummary?.num_joined_members}
                                onView={navigateRoom}
                                renderTopicViewer={(name, topic, requestClose) => (
                                  <RoomTopicViewer
                                    name={name}
                                    topic={topic}
                                    requestClose={requestClose}
                                  />
                                )}
                              />
                            )}
                          </RoomSummaryLoader>
                        ))}
                      </RoomCardGrid>
                    </Box>
                  )}
                  {((spaces && spaces.length === 0 && rooms && rooms.length === 0) ||
                    (!spaces && !rooms)) && (
                    <Box
                      className={css.RoomsInfoCard}
                      direction="Column"
                      justifyContent="Center"
                      alignItems="Center"
                      gap="200"
                    >
                      <Icon size="400" src={Icons.Info} />
                      <Text size="T300" align="Center">
                        No rooms or spaces featured by client provider.
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
