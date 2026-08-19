import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const ThreadsDrawer = style({
  width: toRem(400),
  minWidth: toRem(360),
  overflow: 'hidden',
  // Height comes from flexbox: this column is a stretch child of the drawer
  // row (which itself stretches to the content-area height inside Room), so we
  // never set a percentage height here — percentage heights resolve to auto when
  // an ancestor's height is itself flex-stretched rather than definite, which is
  // what made the reply composer float with thread length. The drawer fills via
  // flex grow/stretch and `overflow: hidden` clips any overflow.
  minHeight: 0,
});

// Column wrapper between the drawer and its scroll area. minHeight: 0 lets it
// shrink below its content (so a tall message list never pushes the reply
// composer off the bottom); height comes from flex grow, not a percentage.
export const ThreadsDrawerBody = style({
  minHeight: 0,
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
  // Allow the scroll region to shrink below its content height in the column
  // so the reply composer stays pinned at the bottom of the window instead of
  // being pushed off-screen by tall message lists.
  minHeight: 0,
  flexGrow: 1,
});

export const ThreadDrawerContent = style({
  padding: `${config.space.S200} 0`,
});
