import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { as } from 'folds';
import { IImageInfo } from 'matrix-js-sdk';
import to from 'await-to-js';
import { MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../utils/blurHash';

export type ImageRenderProps = {
  info: IImageInfo;
  getSrc: () => Promise<string>;
  renderBlurHash: (blurHash: string) => ReactNode;
  renderImage: (src: string, onLoad: () => void, onError: () => void) => ReactNode;
};
export const ImageRenderer = as<'div', ImageRenderProps>(
  ({ info, getSrc, renderBlurHash, renderImage, children, ...props }, ref) => {
    const [loaded, setLoaded] = useState<boolean>(false);
    const [src, setSrc] = useState<string>();

    const blurHash =
      info && MATRIX_BLUR_HASH_PROPERTY_NAME in info
        ? (info[MATRIX_BLUR_HASH_PROPERTY_NAME] as unknown)
        : undefined;

    const handleLoad = () => setLoaded(true);
    const handleError = () => setLoaded(false);

    const handleLoadSrc = useCallback(async () => {
      const [err, srcUrl] = await to(getSrc());
      // TODO: handle error
      if (typeof srcUrl === 'string') {
        setSrc(srcUrl);
      }
    }, [getSrc]);

    useEffect(() => {
      handleLoadSrc();
    }, [handleLoadSrc]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }} {...props} ref={ref}>
        {loaded !== true && typeof blurHash === 'string' && (
          <div style={{ position: 'absolute', inset: 0 }}>{renderBlurHash(blurHash)}</div>
        )}
        {src && (
          <div style={{ position: 'absolute', inset: 0 }}>
            {renderImage(src, handleLoad, handleError)}
          </div>
        )}
        {children && <div style={{ position: 'absolute', inset: 0 }}>{children}</div>}
      </div>
    );
  }
);
