/* eslint-disable jsx-a11y/media-has-caption */
import { Box, Icon, IconButton, Icons, ProgressBar, Text, as, toRem } from 'folds';
import React, { MutableRefObject, RefCallback, useCallback, useRef, useState } from 'react';
import {
  PlayTimeCallback,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaVolume,
} from '../../hooks/media';
import { useThrottle } from '../../hooks/useThrottle';

const PLAY_TIME_THROTTLE_OPS = {
  wait: 500,
  immediate: true,
};

export const Audio = as<'audio', { as?: never }>(({ ...props }, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const getAudioRef = useCallback(() => audioRef.current, []);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { volume, mute, setMute } = useMediaVolume(getAudioRef);
  const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
    setDuration(d);
    setCurrentTime(ct);
  }, []);
  useMediaPlayTimeCallback(
    getAudioRef,
    useThrottle(handlePlayTimeCallback, PLAY_TIME_THROTTLE_OPS)
  );

  const handleRefCallback: RefCallback<HTMLAudioElement> = (audioEl) => {
    audioRef.current = audioEl;
    if (typeof ref === 'function') {
      ref(audioEl);
    } else if (ref) {
      const propRef = ref as MutableRefObject<HTMLAudioElement | null>;
      propRef.current = audioEl;
    }
  };

  return (
    <Box grow="Yes" alignItems="Center" gap="200">
      <audio controls={false} {...props} ref={handleRefCallback} />
      <IconButton
        onClick={() => setPlaying(!playing)}
        variant="SurfaceVariant"
        size="300"
        radii="300"
        aria-label="Play Audio"
      >
        <Icon src={playing ? Icons.Pause : Icons.Play} size="400" filled />
      </IconButton>

      <Text size="T200">{(currentTime / 60).toFixed(2).toString().replace(/\./g, ':')}</Text>
      <Box grow="Yes" direction="Column">
        <ProgressBar
          as="div"
          variant="Secondary"
          size="300"
          min={0}
          max={duration}
          value={currentTime}
          radii="0"
        />
      </Box>
      <Text size="T200">{(duration / 60).toFixed(2).toString().replace(/\./g, ':')}</Text>

      <IconButton variant="SurfaceVariant" size="300" radii="300" onClick={() => setMute(!mute)}>
        <Icon src={mute ? Icons.VolumeMute : Icons.VolumeHigh} size="200" />
      </IconButton>
      <ProgressBar
        style={{ width: toRem(48) }}
        variant="Secondary"
        size="300"
        min={0}
        max={1}
        value={volume}
        radii="0"
      />
    </Box>
  );
});
