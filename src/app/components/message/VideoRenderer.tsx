import React, { ReactNode, useCallback, useState } from 'react';
import { Box, as } from 'folds';
import to from 'await-to-js';
import {
  IEncryptedFile,
  IImageInfo,
  IThumbnailContent,
  IVideoInfo,
} from '../../../types/matrix/common';

enum LoadStatus {
  Initial = 'initial',
  Loading = 'loading',
  Loaded = 'loaded',
}

export type VideoRendererProps = {
  info: IVideoInfo & IThumbnailContent;
  getSrc: () => Promise<string>;
  renderThumbnail?: (
    thumbnailInfo: IImageInfo,
    thumbnailUrl?: string,
    thumbnailFile?: IEncryptedFile
  ) => ReactNode;
  renderPreControl: (loading: boolean, play: () => void) => ReactNode;
  renderVideo: (src: string, onLoad: () => void, onError: () => void) => ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
};
export const VideoRenderer = as<'div', VideoRendererProps>(
  (
    {
      info,
      getSrc,
      renderThumbnail,
      renderPreControl,
      renderVideo,
      renderError,
      children,
      ...props
    },
    ref
  ) => {
    const [loadStatus, setLoadStatus] = useState<LoadStatus>(LoadStatus.Initial);
    const [src, setSrc] = useState<string>();
    const [error, setError] = useState<Error>();

    const {
      thumbnail_info: thumbnailInfo,
      thumbnail_file: thumbnailFile,
      thumbnail_url: thumbnailUrl,
    } = info;

    const handleLoadSrc = useCallback(async () => {
      setLoadStatus(LoadStatus.Loading);
      const [err, srcUrl] = await to(getSrc());
      if (err || typeof srcUrl !== 'string') {
        setLoadStatus(LoadStatus.Initial);
        setError(err ?? new Error('Failed to get Video url!'));
      }
      if (typeof srcUrl === 'string') {
        setSrc(srcUrl);
      }
    }, [getSrc]);

    const handleLoad = () => setLoadStatus(LoadStatus.Loaded);
    const handleError = () => {
      setLoadStatus(LoadStatus.Initial);
      setError(new Error('Failed to load Video!'));
    };

    const handleRetry = () => {
      setError(undefined);
      handleLoadSrc();
    };

    const handlePlay = () => {
      handleLoadSrc();
    };

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }} {...props} ref={ref}>
        {loadStatus !== LoadStatus.Loaded && thumbnailInfo && renderThumbnail && (
          <Box
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            style={{ position: 'absolute', inset: 0 }}
          >
            {renderThumbnail(thumbnailInfo, thumbnailUrl, thumbnailFile)}
          </Box>
        )}
        {src && !error && (
          <Box
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            style={{ position: 'absolute', inset: 0 }}
          >
            {renderVideo(src, handleLoad, handleError)}
          </Box>
        )}
        {!src && !error && (
          <Box
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            style={{ position: 'absolute', inset: 0 }}
          >
            {renderPreControl(loadStatus === LoadStatus.Loading, handlePlay)}
          </Box>
        )}
        {error && renderError && (
          <Box
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            style={{ position: 'absolute', inset: 0 }}
          >
            {renderError(error, handleRetry)}
          </Box>
        )}
        {children && (
          <Box
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            style={{ position: 'absolute', inset: 0 }}
          >
            {children}
          </Box>
        )}
      </div>
    );
  }
);
