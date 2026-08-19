import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ThreadsDrawer = style({
  width: toRem(320),
});

export const ThreadsDrawerHeader = style({
  flexShrink: 0,
  padding: `0 ${config.space.S200} 0 ${config.space.S300}`,
  borderBottomWidth: config.borderWidth.B300,
});

export const ThreadsDrawerDetailHeader = style({
  flexShrink: 0,
  padding: `0 ${config.space.S200} 0 ${config.space.S100}`,
  borderBottomWidth: config.borderWidth.B300,
});

export const ThreadDrawerContentBase = style({
  position: 'relative',
  overflow: 'hidden',
});

export const ThreadDrawerContent = style({
  padding: `${config.space.S200} 0`,
});
