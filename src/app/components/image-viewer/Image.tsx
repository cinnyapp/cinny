/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useMemo } from 'react';
import { as } from 'folds';
import * as css from './ImageViewer.css';
import { Pan } from '../../hooks/usePan';

export interface ImageProps {
  alt: string;
  src: string;
  zoom: number;
  pan: Pan;
}

export const Image = as<'img', ImageProps>(({ alt, src, zoom, pan, ...props }) => {
  const imgStyle = useMemo(() => {
    const result: React.CSSProperties = {
      transform: `scale(${zoom}) translate(${pan.translateX / zoom}px, ${pan.translateY / zoom}px)`,
    };

    return result;
  }, [pan.translateX, pan.translateY, zoom]);

  return <img className={css.ImageViewerImg} style={imgStyle} src={src} alt={alt} {...props} />;
});
