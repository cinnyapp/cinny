import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Box, as } from 'folds';
import to from 'await-to-js';

export type AudioRendererProps = {
  getSrc: () => Promise<string>;
  renderPlaceholder?: () => ReactNode;
  renderAudio: (src: string, onLoad: () => void, onError: () => void) => ReactNode;
  renderError?: (error: Error, retry: () => void) => ReactNode;
};
export const AudioRenderer = as<'div', AudioRendererProps>(
  ({ getSrc, renderPlaceholder, renderAudio, renderError, children, ...props }, ref) => {
    const [loaded, setLoaded] = useState<boolean>(false);
    const [src, setSrc] = useState<string>();
    const [error, setError] = useState<Error>();

    const handleLoadSrc = useCallback(async () => {
      const [err, srcUrl] = await to(getSrc());
      if (err || typeof srcUrl !== 'string') {
        setError(err ?? new Error('Failed to get Audio url!'));
      }
      if (typeof srcUrl === 'string') {
        setSrc(srcUrl);
      }
    }, [getSrc]);

    const handleLoad = () => setLoaded(true);
    const handleError = () => {
      setLoaded(false);
      setError(new Error('Failed to load Audio!'));
    };

    const handleRetry = () => {
      setError(undefined);
      handleLoadSrc();
    };

    useEffect(() => {
      handleLoadSrc();
    }, [handleLoadSrc]);

    return (
      <Box grow="Yes" {...props} ref={ref}>
        {!src && renderPlaceholder && renderPlaceholder()}
        {src && !error && renderAudio(src, handleLoad, handleError)}
        {error && renderError && renderError(error, handleRetry)}
        {children}
      </Box>
    );
  }
);
