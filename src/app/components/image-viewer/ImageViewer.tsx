/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useCallback, useState } from 'react';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import * as css from './ImageViewer.css';
import { useZoom } from '../../hooks/useZoom';
import { ImageController } from './ImageController';
import { Pan } from '../../hooks/usePan';

export type ImageViewerProps = {
  alt: string;
  src: string;
  requestClose: () => void;
};

const INITIAL_PAN: Pan = {
  translateX: 0,
  translateY: 0,
};

export const ImageViewer = as<'div', ImageViewerProps>(
  ({ className, alt, src, requestClose, ...props }, ref) => {
    const [pan, setPan] = useState(INITIAL_PAN);
    const { zoom, zoomIn, zoomOut, setZoom } = useZoom(0.2, 0.2, 6);

    const zoomOutOnClick = useCallback(() => {
      const newZoom = zoomOut();

      setPan({
        translateX: (pan.translateX * newZoom) / zoom,
        translateY: (pan.translateY * newZoom) / zoom,
      });
    }, [pan.translateX, pan.translateY, zoom, zoomOut]);

    const zoomInOnClick = useCallback(() => {
      const newZoom = zoomIn();

      setPan({
        translateX: (pan.translateX * newZoom) / zoom,
        translateY: (pan.translateY * newZoom) / zoom,
      });
    }, [pan.translateX, pan.translateY, zoom, zoomIn]);

    const handleDownload = () => {
      FileSaver.saveAs(src, alt);
    };

    const resetZoomOnClick = useCallback(() => {
      setZoom(zoom === 1 ? 2 : 1);
      setPan(INITIAL_PAN);
    }, [setZoom, zoom]);

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
          <Box shrink="No" alignItems="Center" gap="200">
            <IconButton
              variant={zoom < 1 ? 'Success' : 'SurfaceVariant'}
              outlined={zoom < 1}
              size="300"
              radii="Pill"
              onClick={zoomOutOnClick}
              aria-label="Zoom Out"
            >
              <Icon size="50" src={Icons.Minus} />
            </IconButton>
            <Chip variant="SurfaceVariant" radii="Pill" onClick={resetZoomOnClick}>
              <Text size="B300">{Math.round(zoom * 100)}%</Text>
            </Chip>
            <IconButton
              variant={zoom > 1 ? 'Success' : 'SurfaceVariant'}
              outlined={zoom > 1}
              size="300"
              radii="Pill"
              onClick={zoomInOnClick}
              aria-label="Zoom In"
            >
              <Icon size="50" src={Icons.Plus} />
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
        <ImageController
          alt={alt}
          src={src}
          zoom={zoom}
          pan={pan}
          onChangeZoom={setZoom}
          onChangePan={setPan}
        />
      </Box>
    );
  }
);
