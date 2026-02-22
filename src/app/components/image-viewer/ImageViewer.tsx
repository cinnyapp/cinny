/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import FileSaver from 'file-saver';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import * as css from './ImageViewer.css';
import { useZoom } from '../../hooks/useZoom';
import { downloadMedia } from '../../utils/matrix';

export type ImageViewerProps = {
  alt: string;
  src: string;
  requestClose: () => void;
};

export const ImageViewer = as<'div', ImageViewerProps>(
  ({ className, alt, src, requestClose, ...props }, ref) => {
    const { zoom, zoomIn, zoomOut, setZoom } = useZoom(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleDownload = async () => {
      const fileContent = await downloadMedia(src);
      FileSaver.saveAs(fileContent, alt);
    };

    const getClampedPosition = useCallback((x: number, y: number, currentZoom: number) => {
      if (!containerRef.current || !imgRef.current) return { x, y };

      const container = containerRef.current.getBoundingClientRect();
      const imgWidth = imgRef.current.offsetWidth * currentZoom;
      const imgHeight = imgRef.current.offsetHeight * currentZoom;

      const maxX = Math.max(0, (imgWidth - container.width) / 2);
      const maxY = Math.max(0, (imgHeight - container.height) / 2);

      return {
        x: Math.min(Math.max(x, -maxX), maxX),
        y: Math.min(Math.max(y, -maxY), maxY),
      };
    }, []);

    useEffect(() => {
      setPan((p) => getClampedPosition(p.x, p.y, zoom));
    }, [zoom, getClampedPosition]);

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = e.deltaY * -0.001;
        const newZoom = Math.min(Math.max(0.1, zoom + delta), 5);
        setZoom(newZoom);
      },
      [zoom, setZoom]
    );

    const handleMouseDown = (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDragging.current) return;

        const deltaX = e.clientX - lastMouse.current.x;
        const deltaY = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };

        setPan((prev) => {
          const nextX = prev.x + deltaX * 0.8;
          const nextY = prev.y + deltaY * 0.8;
          return getClampedPosition(nextX, nextY, zoom);
        });
      },
      [zoom, getClampedPosition]
    );

    const handleMouseUp = useCallback(() => {
      isDragging.current = false;
    }, []);

    useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [handleMouseMove, handleMouseUp]);

    let cursor = 'grab';
    if (zoom <= 1) {
      cursor = 'default';
    } else if (isDragging.current) {
      cursor = 'grabbing';
    }

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
              onClick={zoomOut}
              aria-label="Zoom Out"
            >
              <Icon size="50" src={Icons.Minus} />
            </IconButton>
            <Chip
              variant="SurfaceVariant"
              radii="Pill"
              onClick={() => setZoom(zoom === 1 ? 2 : 1)}
              style={{ minWidth: '4rem', justifyContent: 'center' }}
            >
              <Text size="B300">{Math.round(zoom * 100)}%</Text>
            </Chip>
            <IconButton
              variant={zoom > 1 ? 'Success' : 'SurfaceVariant'}
              outlined={zoom > 1}
              size="300"
              radii="Pill"
              onClick={zoomIn}
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
        <Box
          grow="Yes"
          className={css.ImageViewerContent}
          justifyContent="Center"
          alignItems="Center"
          onWheel={handleWheel}
          ref={containerRef}
        >
          <img
            ref={imgRef}
            className={css.ImageViewerImg}
            style={{
              cursor,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              userSelect: 'none',
            }}
            src={src}
            alt={alt}
            onMouseDown={handleMouseDown}
            draggable={false}
          />
        </Box>
      </Box>
    );
  }
);
