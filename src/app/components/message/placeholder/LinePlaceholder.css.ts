import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const LinePlaceholder = style([
  DefaultReset,
  {
    width: '100%',
    height: toRem(16),
    borderRadius: config.radii.R300,
    backgroundColor: color.SurfaceVariant.Container,
  },
]);
