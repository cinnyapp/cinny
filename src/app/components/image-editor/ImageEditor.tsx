import React, { ChangeEventHandler, useCallback, useState } from 'react';
import classNames from 'classnames';
import Cropper, { Area, Point } from 'react-easy-crop';
import { Box, Chip, Header, Icon, IconButton, Icons, Spinner, Text, as, color } from 'folds';
import * as css from './ImageEditor.css';
import { turn } from './cropGeometry';
import { cropImage } from './cropImage';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const pngName = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'avatar'}.png`;

export type ImageEditorProps = {
  name: string;
  url: string;
  requestClose: () => void;
  // Receives the cropped square image.
  onSave: (file: File) => void;
};

export const ImageEditor = as<'div', ImageEditorProps>(
  ({ className, name, url, requestClose, onSave, ...props }, ref) => {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [rotation, setRotation] = useState(0);
    const [area, setArea] = useState<Area>();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>();

    const handleCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

    const handleZoomInput: ChangeEventHandler<HTMLInputElement> = (evt) =>
      setZoom(clampZoom(Number(evt.target.value)));

    const handleApply = async () => {
      if (!area || saving) return;
      setSaving(true);
      setError(undefined);
      try {
        const blob = await cropImage(url, area, rotation);
        onSave(new File([blob], pngName(name), { type: 'image/png' }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't crop the image");
        setSaving(false);
      }
    };

    return (
      <Box
        className={classNames(css.ImageEditor, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.ImageEditorHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose} aria-label="Cancel">
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              Edit Avatar
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <Chip
              variant="Primary"
              radii="300"
              onClick={handleApply}
              disabled={!area || saving}
              before={saving ? <Spinner size="50" variant="Primary" fill="Solid" /> : undefined}
            >
              <Text size="B300">Save</Text>
            </Chip>
          </Box>
        </Header>
        <div className={css.CropArea}>
          <Cropper
            image={url}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={(value) => setZoom(clampZoom(value))}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
          />
        </div>
        <Box className={css.Controls} alignItems="Center" gap="200">
          <IconButton
            size="300"
            radii="300"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            aria-label="Zoom out"
          >
            <Icon size="100" src={Icons.Minus} />
          </IconButton>
          <input
            className={css.ZoomSlider}
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={handleZoomInput}
            aria-label="Zoom"
          />
          <IconButton
            size="300"
            radii="300"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            aria-label="Zoom in"
          >
            <Icon size="100" src={Icons.Plus} />
          </IconButton>
          <IconButton
            size="300"
            radii="300"
            onClick={() => setRotation((r) => turn(r, -90))}
            aria-label="Rotate left"
          >
            <Icon className={css.Mirrored} size="100" src={Icons.Reload} />
          </IconButton>
          <IconButton
            size="300"
            radii="300"
            onClick={() => setRotation((r) => turn(r, 90))}
            aria-label="Rotate right"
          >
            <Icon size="100" src={Icons.Reload} />
          </IconButton>
        </Box>
        {error && (
          <Box className={css.Controls}>
            <Text size="T300" style={{ color: color.Critical.Main }}>
              {error}
            </Text>
          </Box>
        )}
      </Box>
    );
  }
);
