/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import React, { useLayoutEffect, useState } from 'react';
import { as } from 'folds';
import * as css from './ImageViewer.css';
import { Image } from './Image';
import { Pan, usePan } from '../../hooks/usePan';
import { useWheelZoom } from '../../hooks/useWheelZoom';

export interface ImageControllerProps {
  alt: string;
  src: string;
  zoom: number;
  pan: Pan;

  onChangeZoom: React.Dispatch<number>;
  onChangePan: React.Dispatch<Pan>;
}

export const ImageController = as<'div', ImageControllerProps>(
  ({ alt, src, zoom, pan, onChangeZoom, onChangePan, ...props }) => {
    const [imageContainer, setImageContainer] = useState<HTMLDivElement | null>(null);
    const { pan: internalPan, setPan, cursor, onMouseDown } = usePan(true);

    useWheelZoom(imageContainer, (delta, cursor) => {
      // Calculate next zoom
      const newZoom = Math.min(Math.max(zoom + (zoom * -delta) / 500, 0.2), 6);
      //                                       | Makes zooming more natural

      const imageContainerRect = imageContainer!.getBoundingClientRect();

      // Calculate in which direction and how much we need to move
      const cursorXK = (cursor.x - imageContainerRect.x) / imageContainerRect.width - 0.5;
      const cursorYK = (cursor.y - imageContainerRect.y) / imageContainerRect.height - 0.5;

      // Calculate new position of image
      const newX =
        ((internalPan.translateX -
          ((cursorXK * imageContainerRect.width) / newZoom) * (newZoom - zoom)) *
          newZoom) /
        zoom;
      const newY =
        ((internalPan.translateY -
          ((cursorYK * imageContainerRect.height) / newZoom) * (newZoom - zoom)) *
          newZoom) /
        zoom;

      onChangePan({
        translateX: newX,
        translateY: newY,
      });

      onChangeZoom(newZoom);
    });

    useLayoutEffect(() => {
      setPan({
        translateX: pan.translateX,
        translateY: pan.translateY,
      });
    }, [pan.translateX, pan.translateY, setPan]);

    useLayoutEffect(() => {
      onChangePan({
        translateX: internalPan.translateX,
        translateY: internalPan.translateY,
      });
    }, [internalPan.translateX, internalPan.translateY, onChangePan]);

    return (
      <div
        ref={setImageContainer}
        className={css.ImageViewerContent}
        style={{ cursor }}
        onMouseDown={onMouseDown}
        {...props}
      >
        <Image src={src} alt={alt} zoom={zoom} pan={internalPan} />
      </div>
    );
  }
);
