import React, { useEffect, useRef } from 'react';
import { Box, Text, config } from 'folds';
import { useAtomValue } from 'jotai';
import { Track, RemoteParticipant } from 'livekit-client';
import { voiceSessionAtom } from '../../state/voiceChannel';

// Attach a MediaStreamTrack to a <video> element
function VideoTile({ track, label }: { track: Track; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return (
    <Box
      direction="Column"
      style={{
        position: 'relative',
        background: '#111',
        borderRadius: config.radii.R400,
        overflow: 'hidden',
        minWidth: 200,
        minHeight: 150,
        flex: '1 1 200px',
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={track.source === Track.Source.Camera}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: config.space.S100,
          left: config.space.S100,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: config.radii.R300,
          padding: `2px ${config.space.S100}`,
        }}
      >
        <Text size="T100" style={{ color: '#fff' }}>
          {label}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Floating overlay that shows video tiles for camera and screenshare tracks.
 * Only renders when there are active video or screenshare tracks.
 */
export function VideoOverlay() {
  const voiceSession = useAtomValue(voiceSessionAtom);

  if (!voiceSession || voiceSession.connectionState !== 'connected') return null;

  const { livekitRoom, isCamEnabled, isScreensharing } = voiceSession;

  // Collect all video/screenshare tracks from local and remote participants
  const tiles: Array<{ track: Track; label: string }> = [];

  // Local camera
  if (isCamEnabled) {
    const camPub = livekitRoom.localParticipant.getTrackPublication(Track.Source.Camera);
    if (camPub?.track) {
      tiles.push({ track: camPub.track, label: 'You (camera)' });
    }
  }

  // Local screenshare
  if (isScreensharing) {
    const ssPub = livekitRoom.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (ssPub?.track) {
      tiles.push({ track: ssPub.track, label: 'You (screen)' });
    }
  }

  // Remote participants
  livekitRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
    participant.trackPublications.forEach((pub) => {
      if (
        pub.track &&
        (pub.source === Track.Source.Camera || pub.source === Track.Source.ScreenShare)
      ) {
        const label = `${participant.identity} (${pub.source === Track.Source.ScreenShare ? 'screen' : 'camera'})`;
        tiles.push({ track: pub.track, label });
      }
    });
  });

  if (tiles.length === 0) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 120,
        right: 16,
        zIndex: 1000,
        maxWidth: 640,
        maxHeight: '60vh',
        overflowY: 'auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: config.space.S100,
        background: 'rgba(0,0,0,0.8)',
        borderRadius: config.radii.R400,
        padding: config.space.S200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {tiles.map(({ track, label }) => (
        <VideoTile key={label} track={track} label={label} />
      ))}
    </Box>
  );
}
