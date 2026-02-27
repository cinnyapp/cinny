import React from 'react';
import { Box, Icon, IconButton, Icons, Text, Tooltip, TooltipProvider, config } from 'folds';
import { useAtomValue } from 'jotai';
import { voiceSessionAtom } from '../../state/voiceChannel';
import { useVoiceActions } from './VoiceChannelProvider';
import { useMatrixClient } from '../../hooks/useMatrixClient';

/**
 * Discord-like persistent bottom bar shown whenever the user is connected to a
 * voice channel. Displays the room name, connection status, and controls for
 * mute / camera / screenshare / disconnect.
 */
export function VoiceControlBar() {
  const mx = useMatrixClient();
  const voiceSession = useAtomValue(voiceSessionAtom);
  const { leaveVoice, toggleMic, toggleCamera, toggleScreenshare } = useVoiceActions();

  if (!voiceSession) return null;

  const room = mx.getRoom(voiceSession.roomId);
  const roomName = room?.name ?? voiceSession.roomId;

  const statusLabel =
    voiceSession.connectionState === 'connecting' ? 'Connecting…' : 'Voice Connected';

  return (
    <Box
      direction="Column"
      style={{
        borderTop: `1px solid ${config.color.Surface.ContainerLine}`,
        padding: config.space.S200,
        background: config.color.Surface.Container,
        flexShrink: 0,
      }}
    >
      {/* Status row */}
      <Box alignItems="Center" gap="200" style={{ marginBottom: config.space.S100 }}>
        <Box
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background:
              voiceSession.connectionState === 'connected'
                ? config.color.Secondary.Main
                : config.color.Warning.Main,
            flexShrink: 0,
          }}
        />
        <Box grow="Yes" direction="Column">
          <Text size="T200" priority="300" truncate>
            {statusLabel}
          </Text>
          <Text size="T100" priority="200" truncate>
            {roomName}
          </Text>
        </Box>
      </Box>

      {/* Controls row */}
      <Box gap="100" justifyContent="Center" alignItems="Center">
        <TooltipProvider
          tooltip={
            <Tooltip>
              <Text>{voiceSession.isMicMuted ? 'Unmute' : 'Mute'}</Text>
            </Tooltip>
          }
          position="Top"
          offset={4}
        >
          {(ref) => (
            <IconButton
              ref={ref}
              onClick={toggleMic}
              variant={voiceSession.isMicMuted ? 'Critical' : 'Background'}
              fill={voiceSession.isMicMuted ? 'Solid' : 'None'}
              size="300"
              radii="300"
              aria-label={voiceSession.isMicMuted ? 'Unmute' : 'Mute'}
            >
              <Icon src={voiceSession.isMicMuted ? Icons.MicMute : Icons.Mic} size="200" />
            </IconButton>
          )}
        </TooltipProvider>

        <TooltipProvider
          tooltip={
            <Tooltip>
              <Text>{voiceSession.isCamEnabled ? 'Disable Camera' : 'Enable Camera'}</Text>
            </Tooltip>
          }
          position="Top"
          offset={4}
        >
          {(ref) => (
            <IconButton
              ref={ref}
              onClick={toggleCamera}
              variant={voiceSession.isCamEnabled ? 'Secondary' : 'Background'}
              fill={voiceSession.isCamEnabled ? 'Solid' : 'None'}
              size="300"
              radii="300"
              aria-label={voiceSession.isCamEnabled ? 'Disable Camera' : 'Enable Camera'}
            >
              <Icon src={Icons.Video} size="200" />
            </IconButton>
          )}
        </TooltipProvider>

        <TooltipProvider
          tooltip={
            <Tooltip>
              <Text>{voiceSession.isScreensharing ? 'Stop Screenshare' : 'Share Screen'}</Text>
            </Tooltip>
          }
          position="Top"
          offset={4}
        >
          {(ref) => (
            <IconButton
              ref={ref}
              onClick={toggleScreenshare}
              variant={voiceSession.isScreensharing ? 'Secondary' : 'Background'}
              fill={voiceSession.isScreensharing ? 'Solid' : 'None'}
              size="300"
              radii="300"
              aria-label={voiceSession.isScreensharing ? 'Stop Screenshare' : 'Share Screen'}
            >
              <Icon src={Icons.Computer} size="200" />
            </IconButton>
          )}
        </TooltipProvider>

        <TooltipProvider
          tooltip={
            <Tooltip>
              <Text>Disconnect</Text>
            </Tooltip>
          }
          position="Top"
          offset={4}
        >
          {(ref) => (
            <IconButton
              ref={ref}
              onClick={leaveVoice}
              variant="Critical"
              fill="Solid"
              size="300"
              radii="300"
              aria-label="Disconnect from voice"
            >
              <Icon src={Icons.Cross} size="200" />
            </IconButton>
          )}
        </TooltipProvider>
      </Box>
    </Box>
  );
}
