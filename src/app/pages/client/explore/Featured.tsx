import React, { useCallback } from 'react';
import { Box, Icon, Icons, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { RoomCard } from '../../../components/room-card';
import { getCanonicalAliasRoomId, isRoomAlias } from '../../../utils/matrix';
import * as css from './style.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { RoomSummaryLoader } from '../../../components/RoomSummaryLoader';
import { Content, ContentBody, ContentHero, ContentHeroSection } from '../../../components/content';

export function FeaturedRooms() {
  const mx = useMatrixClient();
  const { featuredCommunities } = useClientConfig();
  const { rooms, spaces } = featuredCommunities ?? {};
  const allRooms = useAtomValue(allRoomsAtom);

  const joinedRoom = useCallback(
    (roomIdOrAlias: string): boolean => {
      const roomId = isRoomAlias(roomIdOrAlias)
        ? getCanonicalAliasRoomId(mx, roomIdOrAlias)
        : roomIdOrAlias;

      if (!roomId) return false;

      return allRooms.includes(roomId);
    },
    [mx, allRooms]
  );

  return (
    <Content>
      <ContentHeroSection>
        <ContentHero
          icon={<Icon size="600" src={Icons.Bulb} />}
          title="Featured by Client"
          subTitle="Find and explore public rooms and spaces featured by client provider."
        />
      </ContentHeroSection>
      <ContentBody>
        <Box direction="Column" gap="700">
          <Box direction="Column" gap="400">
            <Text size="H4">Featured Spaces</Text>
            <Box className={css.CardGrid} gap="400" wrap="Wrap">
              {spaces?.map((roomIdOrAlias) => (
                <RoomSummaryLoader key={roomIdOrAlias} roomIdOrAlias={roomIdOrAlias}>
                  {(roomSummary) => (
                    <RoomCard
                      roomIdOrAlias={roomIdOrAlias}
                      joined={joinedRoom(roomIdOrAlias)}
                      avatarUrl={roomSummary?.avatar_url}
                      name={roomSummary?.name}
                      topic={roomSummary?.topic}
                      memberCount={roomSummary?.num_joined_members}
                    />
                  )}
                </RoomSummaryLoader>
              ))}
            </Box>
          </Box>
          <Box direction="Column" gap="400">
            <Text size="H4">Featured Rooms</Text>
            <Box className={css.CardGrid} gap="400" wrap="Wrap">
              {rooms?.map((roomIdOrAlias) => (
                <RoomSummaryLoader key={roomIdOrAlias} roomIdOrAlias={roomIdOrAlias}>
                  {(roomSummary) => (
                    <RoomCard
                      roomIdOrAlias={roomIdOrAlias}
                      joined={joinedRoom(roomIdOrAlias)}
                      avatarUrl={roomSummary?.avatar_url}
                      name={roomSummary?.name}
                      topic={roomSummary?.topic}
                      memberCount={roomSummary?.num_joined_members}
                    />
                  )}
                </RoomSummaryLoader>
              ))}
            </Box>
          </Box>
        </Box>
      </ContentBody>
    </Content>
  );
}
