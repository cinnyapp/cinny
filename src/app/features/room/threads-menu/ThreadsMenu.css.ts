import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ThreadsMenu = style({
  display: 'flex',
  maxWidth: toRem(548),
  width: '100vw',
  maxHeight: '90vh',
});

export const ThreadsMenuHeader = style({
  paddingLeft: config.space.S400,
  paddingRight: config.space.S200,
});

export const ThreadsMenuContent = style({
  paddingLeft: config.space.S200,
});
