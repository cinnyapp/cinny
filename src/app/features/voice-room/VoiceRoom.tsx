import React, { useCallback, useEffect, useState } from 'react';
import {
  LiveKitRoom as LiveKitRoomBase,
  GridLayout,
  ParticipantTile as ParticipantTileBase,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import {
  Avatar,
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Text,
  Tooltip,
  TooltipProvider,
  config,
  color,
  toRem,
} from 'folds';
import { Room as MatrixRoom } from 'matrix-js-sdk';
import { useSetAtom } from 'jotai';
import { useRoomName } from '../../hooks/useRoomMeta';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { fetchLiveKitToken } from './LiveKitService';
import { useClientConfig } from '../../hooks/useClientConfig';
import { activeVoiceRoomAtom } from '../../state/voiceChannel';
import { StateEvent } from '../../../types/matrix/room';
import { nameInitials } from '../../utils/common';
import colorMXID from '../../../util/colorMXID';
import * as css from './VoiceRoom.css';

// Cast to React.FC<any> to fix JSX compatibility (jsx:"react" mode, ReactNode vs ReactElement mismatch)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LiveKitRoom = LiveKitRoomBase as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ParticipantTile = ParticipantTileBase as unknown as React.FC<any>;

type VoiceControlsProps = {
  onDisconnect: () => void;
};

function VoiceControls({ onDisconnect }: VoiceControlsProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const handleToggleMic = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const handleToggleCamera = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }, [localParticipant, isCameraEnabled]);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
    } else {
      await localParticipant.setScreenShareEnabled(true);
      setIsScreenSharing(true);
    }
  }, [localParticipant, isScreenSharing]);

  return (
    <div className={css.ControlsBar}>
      <TooltipProvider
        position="Top"
        tooltip={<Tooltip><Text>{isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}</Text></Tooltip>}
      >
        {(ref) => (
          <IconButton
            ref={ref}
            onClick={handleToggleMic}
            style={{
              width: toRem(44),
              height: toRem(44),
              borderRadius: '50%',
              backgroundColor: isMicrophoneEnabled ? undefined : color.Critical.Main,
              color: isMicrophoneEnabled ? undefined : color.Critical.OnMain,
            }}
            aria-label={isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            <Icon size="400" src={isMicrophoneEnabled ? Icons.Message : Icons.Message} />
          </IconButton>
        )}
      </TooltipProvider>

      <TooltipProvider
        position="Top"
        tooltip={<Tooltip><Text>{isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}</Text></Tooltip>}
      >
        {(ref) => (
          <IconButton
            ref={ref}
            onClick={handleToggleCamera}
            style={{
              width: toRem(44),
              height: toRem(44),
              borderRadius: '50%',
              backgroundColor: isCameraEnabled ? undefined : color.Critical.Main,
              color: isCameraEnabled ? undefined : color.Critical.OnMain,
            }}
            aria-label={isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            <Icon size="400" src={Icons.Photo} />
          </IconButton>
        )}
      </TooltipProvider>

      <TooltipProvider
        position="Top"
        tooltip={<Tooltip><Text>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</Text></Tooltip>}
      >
        {(ref) => (
          <IconButton
            ref={ref}
            onClick={handleToggleScreenShare}
            style={{
              width: toRem(44),
              height: toRem(44),
              borderRadius: '50%',
              backgroundColor: isScreenSharing ? color.Primary.Main : undefined,
              color: isScreenSharing ? color.Primary.OnMain : undefined,
            }}
            aria-label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            <Icon size="400" src={Icons.Monitor} />
          </IconButton>
        )}
      </TooltipProvider>

      <TooltipProvider
        position="Top"
        tooltip={<Tooltip><Text>Disconnect</Text></Tooltip>}
      >
        {(ref) => (
          <IconButton
            ref={ref}
            onClick={onDisconnect}
            style={{
              width: toRem(44),
              height: toRem(44),
              borderRadius: '50%',
              backgroundColor: color.Critical.Main,
              color: color.Critical.OnMain,
            }}
            aria-label="Disconnect from voice channel"
          >
            <Icon size="400" src={Icons.Cross} />
          </IconButton>
        )}
      </TooltipProvider>
    </div>
  );
}

type ParticipantAvatarProps = {
  participant: Participant;
  size?: 'small' | 'medium' | 'large';
};

function ParticipantAvatar({ participant, size = 'medium' }: ParticipantAvatarProps) {
  const dim = size === 'small' ? 28 : size === 'medium' ? 40 : 56;
  const initials = nameInitials(participant.name ?? participant.identity ?? '?');
  const bgColor = colorMXID(participant.identity ?? '');

  return (
    <div
      style={{
        width: toRem(dim),
        height: toRem(dim),
        borderRadius: '50%',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: toRem(size === 'small' ? 10 : size === 'medium' ? 14 : 20),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function VoiceRoomInner({ onDisconnect }: { onDisconnect: () => void }) {
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const hasCameraParticipants = cameraTracks.length > 0;

  const videoParticipantIds = new Set(cameraTracks.map((t) => t.participant.identity));
  const audioOnlyParticipants = participants.filter(
    (p) => !videoParticipantIds.has(p.identity)
  );

  return (
    <Box direction="Column" style={{ height: '100%' }}>
      <Box grow="Yes" style={{ overflow: 'hidden' }}>
        {hasCameraParticipants ? (
          <Box style={{ height: '100%', padding: config.space.S300, gap: config.space.S200, overflow: 'auto', flexWrap: 'wrap', alignContent: 'flex-start' }}>
            <GridLayout
              tracks={cameraTracks}
              style={{
                height: '100%',
                width: '100%',
              }}
            >
              <ParticipantTile />
            </GridLayout>
          </Box>
        ) : (
          <Box
            alignItems="Center"
            justifyContent="Center"
            style={{ height: '100%', flexDirection: 'column', gap: config.space.S300 }}
          >
            <Icon size="600" src={Icons.VolumeHigh} style={{ opacity: 0.3 }} />
            <Text size="T300" style={{ opacity: 0.5 }}>
              {participants.length === 0
                ? 'No one else is here'
                : `${participants.length} participant${participants.length !== 1 ? 's' : ''} in voice`}
            </Text>
          </Box>
        )}
      </Box>

      {audioOnlyParticipants.length > 0 && (
        <Box
          style={{
            padding: `${config.space.S200} ${config.space.S400}`,
            gap: config.space.S200,
            flexWrap: 'wrap',
            borderTop: `1px solid var(--mx-surface-border, rgba(0,0,0,0.1))`,
            flexShrink: 0,
          }}
        >
          {audioOnlyParticipants.map((p) => (
            <TooltipProvider
              key={p.identity}
              position="Top"
              tooltip={
                <Tooltip>
                  <Text>{p.name ?? p.identity}</Text>
                </Tooltip>
              }
            >
              {(ref) => (
                <div ref={ref} style={{ position: 'relative' }}>
                  <ParticipantAvatar participant={p} size="small" />
                  {(p as any).isSpeaking && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -2,
                        borderRadius: '50%',
                        border: '2px solid var(--mx-success, #3fa55a)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              )}
            </TooltipProvider>
          ))}
        </Box>
      )}

      <RoomAudioRenderer />
      <VoiceControls onDisconnect={onDisconnect} />
    </Box>
  );
}

type VoiceRoomProps = {
  room: MatrixRoom;
};

export function VoiceRoom({ room }: VoiceRoomProps) {
  const mx = useMatrixClient();
  const clientConfig = useClientConfig();
  const roomName = useRoomName(room);
  const setActiveVoiceRoom = useSetAtom(activeVoiceRoomAtom);

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceUrl = clientConfig.livekit?.serviceUrl ?? '';

  const handleJoin = useCallback(async () => {
    if (!serviceUrl) {
      setError('LiveKit service URL is not configured. Please set livekit.serviceUrl in config.json.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const me = mx.getUser(mx.getSafeUserId());
      const displayName = me?.displayName ?? mx.getSafeUserId();

      const result = await fetchLiveKitToken({
        serviceUrl,
        roomId: room.roomId,
        userId: mx.getSafeUserId(),
        displayName,
      });

      const lkServerUrl = result.url ?? serviceUrl.replace('/api', '').replace('/token', '');
      setToken(result.token);
      setServerUrl(lkServerUrl);
      setIsConnected(true);
      setActiveVoiceRoom({
        roomId: room.roomId,
        token: result.token,
        serverUrl: lkServerUrl,
      });

      // Announce presence in voice channel via Matrix state event
      mx.sendStateEvent(
        room.roomId,
        StateEvent.VoiceParticipant as string,
        { active: true },
        mx.getSafeUserId()
      ).catch(() => {/* non-critical */});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join voice channel');
    } finally {
      setIsLoading(false);
    }
  }, [mx, room.roomId, serviceUrl, setActiveVoiceRoom]);

  const markInactive = useCallback(() => {
    mx.sendStateEvent(
      room.roomId,
      StateEvent.VoiceParticipant as string,
      { active: false },
      mx.getSafeUserId()
    ).catch(() => {/* non-critical */});
  }, [mx, room.roomId]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setToken(null);
    setServerUrl(null);
    setActiveVoiceRoom(null);
    markInactive();
  }, [setActiveVoiceRoom, markInactive]);

  useEffect(() => {
    return () => {
      setActiveVoiceRoom(null);
      markInactive();
    };
  }, [room.roomId, setActiveVoiceRoom, markInactive]);

  return (
    <Box direction="Column" style={{ height: '100%' }}>
      <Box
        alignItems="Center"
        style={{
          padding: `${config.space.S300} ${config.space.S400}`,
          borderBottom: '1px solid var(--mx-surface-border, rgba(0,0,0,0.1))',
          minHeight: toRem(56),
          gap: config.space.S200,
          flexShrink: 0,
        }}
      >
        <Avatar size="300">
          <Icon size="200" src={Icons.VolumeHigh} filled />
        </Avatar>
        <Box direction="Column" grow="Yes">
          <Text size="H5" truncate>
            {roomName}
          </Text>
          <Text size="T200" priority="300">
            Voice Channel
          </Text>
        </Box>
      </Box>

      {!isConnected ? (
        <Box
          direction="Column"
          alignItems="Center"
          justifyContent="Center"
          grow="Yes"
          style={{ gap: config.space.S400, padding: config.space.S400 }}
        >
          <Box
            direction="Column"
            alignItems="Center"
            style={{ gap: config.space.S200 }}
          >
            <div
              style={{
                width: toRem(80),
                height: toRem(80),
                borderRadius: '50%',
                backgroundColor: 'var(--mx-surface-hover, rgba(0,0,0,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size="600" src={Icons.VolumeHigh} style={{ opacity: 0.6 }} />
            </div>
            <Text size="H4" align="Center">
              {roomName}
            </Text>
            <Text size="T300" priority="300" align="Center">
              Voice Channel
            </Text>
          </Box>

          {error && (
            <Text
              size="T300"
              align="Center"
              style={{ color: color.Critical.Main, maxWidth: toRem(320) }}
            >
              {error}
            </Text>
          )}

          <Button
            onClick={handleJoin}
            variant="Success"
            size="400"
            radii="400"
            disabled={isLoading}
            before={isLoading ? undefined : <Icon size="200" src={Icons.VolumeHigh} />}
          >
            <Text size="B400">
              {isLoading ? 'Joining...' : 'Join Voice'}
            </Text>
          </Button>

          {!serviceUrl && (
            <Text
              size="T200"
              priority="300"
              align="Center"
              style={{ maxWidth: toRem(320), opacity: 0.7 }}
            >
              Configure <code>livekit.serviceUrl</code> in config.json to enable voice channels.
            </Text>
          )}
        </Box>
      ) : (
        token && serverUrl && (
          <LiveKitRoom
            serverUrl={serverUrl}
            token={token}
            connect
            audio
            video={false}
            onDisconnected={handleDisconnect}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <VoiceRoomInner onDisconnect={handleDisconnect} />
          </LiveKitRoom>
        )
      )}
    </Box>
  );
}
