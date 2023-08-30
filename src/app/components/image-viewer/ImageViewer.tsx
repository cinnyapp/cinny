/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { MouseEventHandler, useState } from 'react';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import * as css from './ImageViewer.css';

export type ImageViewerProps = {
  alt: string;
  src: string;
  requestClose: () => void;
};

type Zoom = {
  scale: number;
  translateX: number;
  translateY: number;
};

const INITIAL_ZOOM = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

const useZoom = () => {
  const [zoom, setZoom] = useState<Zoom>(INITIAL_ZOOM);

  const onMouseDown: MouseEventHandler<HTMLElement> = () => {
    setZoom((z) => {
      if (z.scale === 1) {
        return {
          ...z,
          scale: 2,
        };
      }
      return INITIAL_ZOOM;
    });
  };

  return {
    zoom,
    onMouseDown,
  };
};

export const ImageViewer = as<'div', ImageViewerProps>(
  ({ className, alt, src, requestClose, ...props }, ref) => {
    const { zoom, onMouseDown } = useZoom();

    const handleDownload = () => {
      FileSaver.saveAs(src, alt);
    };

    return (
      <Box
        className={classNames(css.ImageViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.ImageViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose}>
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              {alt}
            </Text>
          </Box>
          <Box alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={() => window.open(src)}>
              <Icon size="50" src={Icons.External} />
            </IconButton>
            <Chip
              variant="Primary"
              onClick={handleDownload}
              radii="300"
              before={<Icon size="50" src={Icons.Download} />}
            >
              <Text size="B300">Download</Text>
            </Chip>
          </Box>
        </Header>
        <Box
          grow="Yes"
          className={css.ImageViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <img
            className={css.ImageViewerImg}
            style={{
              cursor: zoom.scale === 1 ? 'zoom-in' : 'zoom-out',
              transform: `scale(${zoom.scale}) translate(${zoom.translateX}, ${zoom.translateY})`,
            }}
            src={src}
            alt={alt}
            onMouseDown={onMouseDown}
          />
        </Box>
      </Box>
    );
  }
);
