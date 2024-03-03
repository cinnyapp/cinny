import React, { useCallback } from 'react';
import { Box, Icon, Icons, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { RoomCard, RoomCardGrid } from '../../../components/room-card';
import { getCanonicalAliasRoomId, isRoomAlias } from '../../../utils/matrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { RoomSummaryLoader } from '../../../components/RoomSummaryLoader';
import { Content, ContentBody, ContentHero, ContentHeroSection } from '../../../components/content';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';

export function FeaturedRooms() {
  const mx = useMatrixClient();
  const { featuredCommunities } = useClientConfig();
  const { rooms, spaces } = featuredCommunities ?? {};
  const allRooms = useAtomValue(allRoomsAtom);

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

  return (
    <Content>
      <Box direction="Column" gap="200">
        <ContentHeroSection>
          <ContentHero
            icon={<Icon size="600" src={Icons.Bulb} />}
            title="Featured by Client"
            subTitle="Find and explore public rooms and spaces featured by client provider."
          />
        </ContentHeroSection>
        <ContentBody>
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
          </Box>
        </ContentBody>
      </Box>
    </Content>
  );
}
