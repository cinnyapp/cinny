import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ThreadView = style({
  width: toRem(456),
  flexShrink: 0,
  flexGrow: 0,
});

export const ThreadViewFloating = style({
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  zIndex: 1,

  maxWidth: toRem(456),
  flexShrink: 1,
  width: '100vw',
  boxShadow: config.shadow.E400,
});
