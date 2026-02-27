import React from 'react';
import { Box, Avatar, Text, Icon, Icons, config } from 'folds';
import { useAtomValue } from 'jotai';
import { voiceMembersAtom } from '../../state/voiceChannel';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { nameInitials } from '../../utils/common';

type VoiceMembersProps = {
  roomId: string;
};

/**
 * Renders a compact list of member avatars currently connected to the voice
 * channel of the given room — shown below the room name in the sidebar,
 * similar to Discord's voice channel member display.
 *
 * Returns null when nobody is in voice so it takes up zero space.
 */
export function VoiceMembers({ roomId }: VoiceMembersProps) {
  const mx = useMatrixClient();
  const voiceMembers = useAtomValue(voiceMembersAtom);

  const memberIds = voiceMembers.get(roomId);
  if (!memberIds || memberIds.length === 0) return null;

  const room = mx.getRoom(roomId);

  return (
    <Box
      direction="Column"
      style={{
        paddingLeft: config.space.S400,
        paddingBottom: config.space.S100,
      }}
    >
      {/* Voice icon + member count header */}
      <Box alignItems="Center" gap="100" style={{ marginBottom: config.space.S100 }}>
        <Icon
          src={Icons.Mic}
          size="50"
          style={{ opacity: 0.6, color: config.color.Secondary.Main }}
        />
        <Text size="T100" priority="200">
          Voice — {memberIds.length}
        </Text>
      </Box>

      {/* Member rows */}
      {memberIds.map((userId) => {
        const member = room?.getMember(userId);
        const displayName = member?.name ?? userId;
        const avatarUrl = member?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop', false, false) ?? null;

        return (
          <Box
            key={userId}
            alignItems="Center"
            gap="200"
            style={{ padding: `${config.space.S100} 0` }}
          >
            <Avatar size="200" radii="Pill">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <Text as="span" size="H6">
                  {nameInitials(displayName)}
                </Text>
              )}
            </Avatar>
            <Text size="T200" priority="300" truncate>
              {displayName}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
