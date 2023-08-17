import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Box, as } from 'folds';
import { IImageInfo } from 'matrix-js-sdk';
import to from 'await-to-js';
import { MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../utils/blurHash';

export type ImageRendererProps = {
  info: IImageInfo;
  getSrc: () => Promise<string>;
  renderBlurHash?: (blurHash: string) => ReactNode;
  renderImage: (src: string, onLoad: () => void, onError: () => void) => ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
};
export const ImageRenderer = as<'div', ImageRendererProps>(
  ({ info, getSrc, renderBlurHash, renderImage, renderError, children, ...props }, ref) => {
    const [loaded, setLoaded] = useState<boolean>(false);
    const [src, setSrc] = useState<string>();
    const [error, setError] = useState<Error>();

    const blurHash =
      info && MATRIX_BLUR_HASH_PROPERTY_NAME in info
        ? (info[MATRIX_BLUR_HASH_PROPERTY_NAME] as unknown)
        : undefined;

    const handleLoadSrc = useCallback(async () => {
      const [err, srcUrl] = await to(getSrc());
      if (err || typeof srcUrl !== 'string') {
        setError(err ?? new Error('Failed to get Image url!'));
      }
      if (typeof srcUrl === 'string') {
        setSrc(srcUrl);
      }
    }, [getSrc]);

    const handleLoad = () => setLoaded(true);
    const handleError = () => {
      setLoaded(false);
      setError(new Error('Failed to load Image!'));
    };

    const handleRetry = () => {
      setError(undefined);
      handleLoadSrc();
    };

    useEffect(() => {
      handleLoadSrc();
    }, [handleLoadSrc]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }} {...props} ref={ref}>
        {!loaded && typeof blurHash === 'string' && renderBlurHash && (
          <Box
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            style={{ position: 'absolute', inset: 0 }}
          >
            {renderBlurHash(blurHash)}
          </Box>
        )}
        {src && !error && (
          <Box
            direction="Column"
            alignItems="Center"
            justifyContent="Center"
            style={{ position: 'absolute', inset: 0 }}
          >
            {renderImage(src, handleLoad, handleError)}
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
