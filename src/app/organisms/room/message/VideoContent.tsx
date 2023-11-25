import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Icon,
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
import * as css from './styles.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { getFileSrcUrl } from './util';
import { Image, Video } from '../../../components/media';
import { bytesToSize } from '../../../../util/common';
import { millisecondsToMinutesAndSeconds } from '../../../utils/common';

export type VideoContentProps = {
  body: string;
  mimeType: string;
  url: string;
  info: IVideoInfo & IThumbnailContent;
  encInfo?: EncryptedAttachmentInfo;
  autoPlay?: boolean;
  loadThumbnail?: boolean;
};
export const VideoContent = as<'div', VideoContentProps>(
  ({ className, body, mimeType, url, info, encInfo, autoPlay, loadThumbnail, ...props }, ref) => {
    const mx = useMatrixClient();
    const blurHash = info.thumbnail_info?.[MATRIX_BLUR_HASH_PROPERTY_NAME];

    const [load, setLoad] = useState(false);
    const [error, setError] = useState(false);

    const [srcState, loadSrc] = useAsyncCallback(
      useCallback(
        () => getFileSrcUrl(mx.mxcUrlToHttp(url) ?? '', mimeType, encInfo),
        [mx, url, mimeType, encInfo]
      )
    );
    const [thumbSrcState, loadThumbSrc] = useAsyncCallback(
      useCallback(() => {
        const thumbInfo = info.thumbnail_info;
        const thumbMxcUrl = info.thumbnail_file?.url ?? info.thumbnail_url;
        if (typeof thumbMxcUrl !== 'string' || typeof thumbInfo?.mimetype !== 'string') {
          throw new Error('Failed to load thumbnail');
        }
        return getFileSrcUrl(
          mx.mxcUrlToHttp(thumbMxcUrl) ?? '',
          thumbInfo.mimetype,
          info.thumbnail_file
        );
      }, [mx, info])
    );

    const handleLoad = () => {
      setLoad(true);
    };
    const handleError = () => {
      setLoad(false);
      setError(true);
    };

    const handleRetry = () => {
      setError(false);
      loadSrc();
    };

    useEffect(() => {
      if (autoPlay) loadSrc();
    }, [autoPlay, loadSrc]);
    useEffect(() => {
      if (loadThumbnail) loadThumbSrc();
    }, [loadThumbnail, loadThumbSrc]);

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
        {thumbSrcState.status === AsyncStatus.Success && !load && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Image alt={body} title={body} src={thumbSrcState.data} loading="lazy" />
          </Box>
        )}
        {!autoPlay && srcState.status === AsyncStatus.Idle && (
          <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
            <Button
              variant="Secondary"
              fill="Solid"
              radii="300"
              size="300"
              onClick={loadSrc}
              before={<Icon size="Inherit" src={Icons.Play} filled />}
            >
              <Text size="B300">Watch</Text>
            </Button>
          </Box>
        )}
        {srcState.status === AsyncStatus.Success && (
          <Box className={css.AbsoluteContainer}>
            <Video
              title={body}
              src={srcState.data}
              onLoadedMetadata={handleLoad}
              onError={handleError}
              autoPlay
              controls
            />
          </Box>
        )}
        {(srcState.status === AsyncStatus.Loading || srcState.status === AsyncStatus.Success) &&
          !load && (
            <Box className={css.AbsoluteContainer} alignItems="Center" justifyContent="Center">
              <Spinner variant="Secondary" />
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
