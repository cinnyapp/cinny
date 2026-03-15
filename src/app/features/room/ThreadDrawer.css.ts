import { style, globalStyle } from '@vanilla-extract/css';
import { config, color, toRem } from 'folds';

export const ThreadDrawer = style({
  width: toRem(490),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const messageList = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

globalStyle(`body ${messageList} [data-message-id]`, {
  transition: 'background-color 0.1s ease-in-out !important',
});

globalStyle(`body ${messageList} [data-message-id]:hover`, {
  backgroundColor: `${color.Background.ContainerHover} !important`,
});

export const ThreadDrawerHeader = style({
  flexShrink: 0,
  padding: `0 ${config.space.S200} 0 ${config.space.S300}`,
  borderBottomWidth: config.borderWidth.B300,
});

export const ThreadDrawerContent = style({
  position: 'relative',
  overflow: 'hidden',
  flexGrow: 1,
  minHeight: 0, // Ensure flex child can shrink below content size
});

export const ThreadDrawerInput = style({
  flexShrink: 0,
});

export const ThreadDrawerOverlay = style({
  position: 'absolute',
  inset: 0,
  zIndex: 10,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: color.Background.Container,
});

export const ThreadBrowserItem = style({
  width: '100%',
  padding: `${config.space.S200} ${config.space.S100}`,
  borderRadius: config.radii.R300,
  textAlign: 'left',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  color: 'inherit',
  transition: 'background-color 0.1s ease-in-out',
  ':hover': {
    backgroundColor: color.Background.ContainerHover,
  },
});
