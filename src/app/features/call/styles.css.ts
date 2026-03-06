import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ControlCard = style({
  padding: config.space.S300,
});

export const ControlDivider = style({
  height: toRem(24),
});
