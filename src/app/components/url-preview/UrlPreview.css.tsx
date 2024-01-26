import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const UrlPreview = style([
  DefaultReset,
  {
    width: toRem(400),
    minHeight: toRem(102),
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
    borderRadius: config.radii.R300,
    overflow: 'hidden',
  },
]);

export const UrlPreviewImg = style([
  DefaultReset,
  {
    width: toRem(100),
    height: toRem(100),
    objectFit: 'cover',
    objectPosition: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
]);

export const UrlPreviewContent = style([
  DefaultReset,
  {
    padding: config.space.S200,
  },
]);

export const UrlPreviewDescription = style([
  DefaultReset,
  {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
]);
