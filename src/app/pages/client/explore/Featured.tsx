import React, { useCallback } from 'react';
import { Box, Icon, Icons, Scroll, Text, config, toRem } from 'folds';
import { useAtomValue } from 'jotai';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useSpecVersions } from '../../../hooks/useSpecVersions';
import { RoomCard } from '../../../components/room-card';
import { getCanonicalAliasRoomId, isRoomAlias } from '../../../utils/matrix';
import * as css from './style.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { RoomSummaryLoader } from '../../../components/RoomSummaryLoader';

export function FeaturedRooms() {
  const mx = useMatrixClient();
  const caps = useCapabilities();
  const ver = useSpecVersions();
  console.log(caps, ver);
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
    <Box grow="Yes" className={ContainerColor({ variant: 'Surface' })}>
      <Scroll hideTrack>
        <div
          style={{
            paddingLeft: config.space.S500,
            paddingRight: config.space.S100,
            paddingBottom: config.space.S700,
          }}
        >
          <div style={{ padding: '40px 16px' }}>
            <Box direction="Column" gap="400">
              <Box direction="Column" alignItems="Center" gap="200">
                <Icon size="600" src={Icons.Bulb} />
              </Box>
              <Box direction="Column" gap="100" alignItems="Center">
                <Text size="H2">Featured by Client</Text>
                <Text priority="400">
                  Find and explore public rooms and spaces featured by client provider.
                </Text>
              </Box>
            </Box>
          </div>
          <Box
            direction="Column"
            gap="500"
            style={{
              maxWidth: toRem(848),
              margin: 'auto',
            }}
          >
            <Box direction="Column" gap="400">
              <Text size="H4">Featured Spaces</Text>
              <Box className={css.CardGrid} gap="400" wrap="Wrap">
                {spaces?.map((roomIdOrAlias) => (
                  <RoomSummaryLoader roomIdOrAlias={roomIdOrAlias}>
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
                  <RoomSummaryLoader roomIdOrAlias={roomIdOrAlias}>
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
        </div>
      </Scroll>
    </Box>
  );
}
