import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const ThreadsDrawer = style({
  width: toRem(400),
  minWidth: toRem(360),
});

// Thin vertical drag handle on the left edge of the drawer.
export const ThreadsDrawerResizer = style({
  flexShrink: 0,
  width: toRem(6),
  cursor: 'col-resize',
  background: 'transparent',
  transition: 'background 0.15s ease',
  ':hover': {
    background: color.Primary.ContainerLine,
  },
  selectors: {
    '&:active': {
      background: color.Primary.MainLine,
    },
  },
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
