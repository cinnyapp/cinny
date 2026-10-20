import React, {
  ReactEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Icon,
  IconButton,
  Icons,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  as,
} from 'folds';
import classNames from 'classnames';
import { BlurhashCanvas } from 'react-blurhash';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import {
  IThumbnailContent,
  IVideoInfo,
  MATRIX_BLUR_HASH_PROPERTY_NAME,
} from '../../../../types/matrix/common';
import * as css from './style.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { bytesToSize, millisecondsToMinutesAndSeconds } from '../../../utils/common';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { validBlurHash } from '../../../utils/blurHash';
import { getCachedMediaUrl, setCachedMediaUrl } from './mediaCache';

type RenderVideoProps = {
  title: string;
  src: string;
  onLoadedMetadata: () => void;
  onError: ReactEventHandler<HTMLVideoElement>;
  autoPlay: boolean;
  controls: boolean;
  /** A still frame to show before any video data has arrived. */
  poster?: string;
  preload?: 'none' | 'metadata' | 'auto';
};
type VideoContentProps = {
  body: string;
  mimeType: string;
  url: string;
  info: IVideoInfo & IThumbnailContent;
  encInfo?: EncryptedAttachmentInfo;
  autoPlay?: boolean;
  markedAsSpoiler?: boolean;
  spoilerReason?: string;
  renderThumbnail?: () => ReactNode;
  renderVideo: (props: RenderVideoProps) => ReactNode;
  /** Open the chat-wide gallery viewer on this video. */
  onOpenViewer?: () => void;
};
export const VideoContent = as<'div', VideoContentProps>(
  (
    {
      className,
      body,
      mimeType,
      url,
      info,
      encInfo,
      autoPlay,
      markedAsSpoiler,
      spoilerReason,
      renderThumbnail,
      renderVideo,
      onOpenViewer,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const blurHash = validBlurHash(info.thumbnail_info?.[MATRIX_BLUR_HASH_PROPERTY_NAME]);

    const [load, setLoad] = useState(false);
    const [error, setError] = useState(false);
    const [blurred, setBlurred] = useState(markedAsSpoiler ?? false);
    const [progress, setProgress] = useState<number>();

    const httpUrl = useMemo(
      () => mxcUrlToHttp(mx, url, useAuthentication),
      [mx, url, useAuthentication]
    );

    /**
     * An unencrypted video can be played straight from the homeserver: the
     * service worker attaches the access token, and the browser starts
     * decoding as soon as the first bytes arrive instead of waiting for the
     * whole file to be downloaded into a blob first. A 20 MB clip used to mean
     * a 20 MB wait before the first frame.
     *
     * An encrypted one cannot — the bytes are useless until they are decrypted
     * — so it keeps the download-then-play path, now with a progress bar and a
     * cached result so re-opening it is instant.
     */
    const canStream = !encInfo && typeof httpUrl === 'string';
    const [streamFailed, setStreamFailed] = useState(false);
    const streaming = canStream && !streamFailed;
    const [streamRequested, setStreamRequested] = useState(false);
    // Only ever fall back once, so a genuinely broken file still shows an error.
    const fallbackDone = useRef(false);

    /** The server-side thumbnail, used as the <video> poster. */
    const posterUrl = useMemo(() => {
      if (encInfo || info.thumbnail_file) return undefined;
      const thumbMxc = info.thumbnail_url;
      if (typeof thumbMxc !== 'string') return undefined;
      return mxcUrlToHttp(mx, thumbMxc, useAuthentication) ?? undefined;
    }, [mx, encInfo, info.thumbnail_url, info.thumbnail_file, useAuthentication]);

    const [srcState, loadSrc] = useAsyncCallback(
      useCallback(async () => {
        const cached = getCachedMediaUrl(url);
        if (cached) return cached;

        if (!httpUrl) throw new Error('Invalid media URL');
        setProgress(0);
        const fileContent = encInfo
          ? await downloadEncryptedMedia(
              httpUrl,
              (encBuf) => decryptFile(encBuf, mimeType, encInfo),
              (loaded) => setProgress(loaded)
            )
          : await downloadMedia(httpUrl);
        const objectUrl = URL.createObjectURL(fileContent);
        setCachedMediaUrl(url, objectUrl, fileContent.size);
        return objectUrl;
      }, [url, httpUrl, mimeType, encInfo])
    );

    const handleLoad = () => {
      setLoad(true);
    };

    const handleError: ReactEventHandler<HTMLVideoElement> = (evt) => {
      // A <video> also fires `error` when only its poster image failed to
      // load, and then carries no MediaError. Treating that as a broken video
      // would throw away a perfectly good stream, so ignore it.
      if (!evt.currentTarget.error) return;

      setLoad(false);
      // A streamed video can genuinely fail because the service worker was not
      // there to authenticate it (a first, not-yet-controlled page load).
      // Silently fall back to the download-then-play path instead of showing
      // an error the user can do nothing about.
      if (streaming && !fallbackDone.current) {
        fallbackDone.current = true;
        setStreamFailed(true);
        loadSrc();
        return;
      }
      setError(true);
    };

    const handlePlay = useCallback(() => {
      if (streaming) {
        setStreamRequested(true);
        return;
      }
      loadSrc();
    }, [streaming, loadSrc]);

    const handleRetry = () => {
      setError(false);
      loadSrc();
    };

    useEffect(() => {
      if (autoPlay) handlePlay();
    }, [autoPlay, handlePlay]);

    const playbackSrc = streaming && streamRequested ? httpUrl : undefined;
    const blobSrc = srcState.status === AsyncStatus.Success ? srcState.data : undefined;
    const videoSrc = playbackSrc ?? blobSrc;

    const idle = !videoSrc && srcState.status === AsyncStatus.Idle;
    // The encrypted path is the only one that makes you wait before anything plays.
    const downloading = !streaming && srcState.status === AsyncStatus.Loading;

    return (
      <Box className={classNames(css.RelativeBase, className)} {...props} ref={ref}>
        {typeof blurHash === 'string' && !load && (
          <BlurhashCanvas
            style={{ width: '100%', height: '100%' }}
            width={32}
            height={32}
            hash={blurHash}
            punch={1}
          />
        )}
        {renderThumbnail && !load && (
          <Box
            className={classNames(css.AbsoluteContainer, blurred && css.Blur)}
            alignItems="Center"
            justifyContent="Center"
          >
            {renderThumbnail()}
          </Box>
        )}
        {!autoPlay && !blurred && idle && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Button
              variant="Secondary"
              fill="Solid"
              radii="300"
              size="300"
              onClick={handlePlay}
              before={<Icon size="Inherit" src={Icons.Play} filled />}
            >
              <Text size="B300">Watch</Text>
            </Button>
          </Box>
        )}
        {videoSrc && (
          <Box className={classNames(css.AbsoluteContainer, blurred && css.Blur)}>
            {renderVideo({
              title: body,
              src: videoSrc,
              onLoadedMetadata: handleLoad,
              onError: handleError,
              autoPlay: true,
              controls: true,
              poster: posterUrl,
              // Streaming: ask for the header only, then let playback pull the rest.
              preload: 'metadata',
            })}
          </Box>
        )}
        {blurred && !error && srcState.status !== AsyncStatus.Error && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <TooltipProvider
              tooltip={
                typeof spoilerReason === 'string' && (
                  <Tooltip variant="Secondary">
                    <Text>{spoilerReason}</Text>
                  </Tooltip>
                )
              }
              position="Top"
              align="Center"
            >
              {(triggerRef) => (
                <Chip
                  ref={triggerRef}
                  variant="Secondary"
                  radii="Pill"
                  size="500"
                  outlined
                  onClick={() => {
                    setBlurred(false);
                  }}
                >
                  <Text size="B300">Spoiler</Text>
                </Chip>
              )}
            </TooltipProvider>
          </Box>
        )}
        {(downloading || (!!videoSrc && !load)) && !blurred && (
          <Box
            className={css.AbsoluteContainer}
            alignItems="Center"
            justifyContent="Center"
            direction="Column"
            gap="200"
          >
            <Spinner variant="Secondary" />
            {downloading && typeof progress === 'number' && typeof info.size === 'number' && (
              <Badge variant="Secondary" fill="Soft">
                <Text size="L400">
                  {`${Math.min(100, Math.round((progress / info.size) * 100))}%`}
                </Text>
              </Badge>
            )}
          </Box>
        )}
        {onOpenViewer && !blurred && (
          <Box style={{ position: 'absolute', top: 6, right: 6, zIndex: 1 }}>
            <IconButton
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="Pill"
              onClick={onOpenViewer}
              aria-label="Open in full-screen viewer"
              title="Open in full-screen viewer"
              data-media-open-viewer
            >
              <Icon size="50" src={Icons.External} />
            </IconButton>
          </Box>
        )}
        {(error || srcState.status === AsyncStatus.Error) && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <TooltipProvider
              tooltip={
                <Tooltip variant="Critical">
                  <Text>Failed to load video!</Text>
                </Tooltip>
              }
              position="Top"
              align="Center"
            >
              {(triggerRef) => (
                <Button
                  ref={triggerRef}
                  size="300"
                  variant="Critical"
                  fill="Soft"
                  outlined
                  radii="300"
                  onClick={handleRetry}
                  before={<Icon size="Inherit" src={Icons.Warning} filled />}
                >
                  <Text size="B300">Retry</Text>
                </Button>
              )}
            </TooltipProvider>
          </Box>
        )}
        {!load && typeof info.size === 'number' && (
          <Box
            className={css.AbsoluteFooter}
            justifyContent="SpaceBetween"
            alignContent="Center"
            gap="200"
          >
            <Badge variant="Secondary" fill="Soft">
              <Text size="L400">{millisecondsToMinutesAndSeconds(info.duration ?? 0)}</Text>
            </Badge>
            <Badge variant="Secondary" fill="Soft">
              <Text size="L400">{bytesToSize(info.size)}</Text>
            </Badge>
          </Box>
        )}
      </Box>
    );
  }
);
