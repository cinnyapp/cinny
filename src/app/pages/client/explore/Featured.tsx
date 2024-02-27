import React from 'react';
import { Avatar, Box, Icon, Icons, Scroll, Text, config, toRem } from 'folds';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useSpecVersions } from '../../../hooks/useSpecVersions';
import { RoomCard, RoomCardName, RoomCardTopic } from '../../../components/room-card';
import { RoomAvatar } from '../../../components/room-avatar';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import * as css from './style.css';

export function FeaturedRooms() {
  const { featuredCommunities } = useClientConfig();
  const { rooms, spaces } = featuredCommunities ?? {};

  return (
    <Box grow="Yes" className={ContainerColor({ variant: 'Surface' })}>
      <Scroll hideTrack>
        <div
          style={{
            paddingLeft: config.space.S500,
            paddingRight: config.space.S100,
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
                  <RoomCard>
                    <Avatar size="500">
                      <RoomAvatar
                        alt={roomIdOrAlias}
                        renderInitials={() => (
                          <Text as="span" size="H4">
                            {nameInitials(getMxIdLocalPart(roomIdOrAlias))}
                          </Text>
                        )}
                      />
                    </Avatar>
                    <Box direction="Column" gap="100">
                      <RoomCardName>{getMxIdLocalPart(roomIdOrAlias)}</RoomCardName>
                      <RoomCardTopic>{roomIdOrAlias}</RoomCardTopic>
                    </Box>
                  </RoomCard>
                ))}
              </Box>
            </Box>

            <Box direction="Column" gap="400">
              <Text size="H4">Featured Rooms</Text>
              <Box className={css.CardGrid} gap="400" wrap="Wrap">
                {rooms?.map((roomIdOrAlias) => (
                  <RoomCard>
                    <Avatar size="500">
                      <RoomAvatar
                        alt={roomIdOrAlias}
                        renderInitials={() => (
                          <Text as="span" size="H4">
                            {nameInitials(getMxIdLocalPart(roomIdOrAlias))}
                          </Text>
                        )}
                      />
                    </Avatar>
                    <Box direction="Column" gap="100">
                      <RoomCardName>{getMxIdLocalPart(roomIdOrAlias)}</RoomCardName>
                      <RoomCardTopic>{roomIdOrAlias}</RoomCardTopic>
                    </Box>
                  </RoomCard>
                ))}
              </Box>
            </Box>
          </Box>
        </div>
      </Scroll>
    </Box>
  );
}
