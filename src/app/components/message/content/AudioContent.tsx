/* eslint-disable jsx-a11y/media-has-caption */
import React, { useCallback, useRef, useState } from 'react';
import { Badge, Chip, Icon, IconButton, Icons, ProgressBar, Spinner, Text, toRem } from 'folds';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { Range } from 'react-range';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
  useMediaVolume,
} from '../../../hooks/media';
import { useThrottle } from '../../../hooks/useThrottle';
import { secondsToMinutesAndSeconds } from '../../../utils/common';
import { decryptFile, downloadEncryptedMedia, downloadMedia } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useClient } from '../../../hooks/useClient';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { rInfo } from '../../../../client/reader';
import { MediaControl } from '../../media';

const PLAY_TIME_THROTTLE_OPS = {
  wait: 500,
  immediate: true,
};

export type AudioContentProps = {
  mimeType: string;
  url: string;
  info: object;
  encInfo?: object;
};
export function AudioContent({ mimeType, url, info, encInfo }: AudioContentProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const [srcState, loadSrc] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcToHttp(ct.session.baseUrl, url, useAuthentication).url();
      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) =>
            decryptFile(encBuf, mimeType, encInfo as EncryptedAttachmentInfo)
          )
        : await downloadMedia(mediaUrl);
      return URL.createObjectURL(fileContent);
    }, [ct, url, useAuthentication, mimeType, encInfo])
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  // duration in seconds. (NOTE: info.duration is in milliseconds)
  const infoDuration = rInfo.duration(info) ?? 0;
  const [duration, setDuration] = useState((infoDuration >= 0 ? infoDuration : 0) / 1000);

  const getAudioRef = useCallback(() => audioRef.current, []);
  const { loading } = useMediaLoading(getAudioRef);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { seek } = useMediaSeek(getAudioRef);
  const { volume, mute, setMute, setVolume } = useMediaVolume(getAudioRef);
  const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, cTime) => {
    setDuration(d);
    setCurrentTime(cTime);
  }, []);
  useMediaPlayTimeCallback(
    getAudioRef,
    useThrottle(handlePlayTimeCallback, PLAY_TIME_THROTTLE_OPS)
  );

  const handlePlay = () => {
    if (srcState.status === AsyncStatus.Success) {
      setPlaying(!playing);
    } else if (srcState.status !== AsyncStatus.Loading) {
      loadSrc();
    }
  };
  return (
    <MediaControl
      after={
        <Range
          step={1}
          min={0}
          max={duration || 1}
          values={[currentTime]}
          onChange={(values) => seek(values[0])}
          renderTrack={(params) => (
            <div {...params.props}>
              {params.children}
              <ProgressBar
                as="div"
                variant="Secondary"
                size="300"
                min={0}
                max={duration}
                value={currentTime}
                radii="300"
              />
            </div>
          )}
          renderThumb={(params) => (
            <Badge
              size="300"
              variant="Secondary"
              fill="Solid"
              radii="Pill"
              outlined
              {...params.props}
              style={{
                ...params.props.style,
                zIndex: 0,
              }}
            />
          )}
        />
      }
      leftControl={
        <>
          <Chip
            onClick={handlePlay}
            variant="Secondary"
            radii="300"
            disabled={srcState.status === AsyncStatus.Loading}
            before={
              srcState.status === AsyncStatus.Loading || loading ? (
                <Spinner variant="Secondary" size="50" />
              ) : (
                <Icon src={playing ? Icons.Pause : Icons.Play} size="50" filled={playing} />
              )
            }
          >
            <Text size="B300">{playing ? 'Pause' : 'Play'}</Text>
          </Chip>

          <Text size="T200">{`${secondsToMinutesAndSeconds(
            currentTime
          )} / ${secondsToMinutesAndSeconds(duration)}`}</Text>
        </>
      }
      rightControl={
        <>
          <IconButton
            variant="SurfaceVariant"
            size="300"
            radii="Pill"
            onClick={() => setMute(!mute)}
            aria-pressed={mute}
          >
            <Icon src={mute ? Icons.VolumeMute : Icons.VolumeHigh} size="50" />
          </IconButton>
          <Range
            step={0.1}
            min={0}
            max={1}
            values={[volume]}
            onChange={(values) => setVolume(values[0])}
            renderTrack={(params) => (
              <div {...params.props}>
                {params.children}
                <ProgressBar
                  style={{ width: toRem(48) }}
                  variant="Secondary"
                  size="300"
                  min={0}
                  max={1}
                  value={volume}
                  radii="300"
                />
              </div>
            )}
            renderThumb={(params) => (
              <Badge
                size="300"
                variant="Secondary"
                fill="Solid"
                radii="Pill"
                outlined
                {...params.props}
                style={{
                  ...params.props.style,
                  zIndex: 0,
                }}
              />
            )}
          />
        </>
      }
    >
      <audio controls={false} autoPlay ref={audioRef}>
        {srcState.status === AsyncStatus.Success && <source src={srcState.data} type={mimeType} />}
      </audio>
    </MediaControl>
  );
}
