import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const UrlPreview = style([
  DefaultReset,
  {
    width: toRem(400),
    display: 'flex',
    flexDirection: 'column',
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
    minHeight: toRem(100),
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    flexShrink: 0,
    cursor: 'pointer',
  },
]);

export const UrlPreviewHeroImg = style([
  DefaultReset,
  {
    width: '100%',
    maxHeight: toRem(300),
    objectFit: 'contain',
    backgroundColor: '#000',
    cursor: 'pointer',
  },
]);

export const UrlPreviewContent = style([
  DefaultReset,
  {
    padding: config.space.S200,
    flexGrow: 1,
  },
]);

export const UrlPreviewCardRow = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
});

export const UrlPreviewDescription = style([
  DefaultReset,
  {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
]);
