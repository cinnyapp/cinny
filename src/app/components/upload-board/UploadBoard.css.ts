import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const UploadBoardBase = style([
  DefaultReset,
  {
    position: 'relative',
    pointerEvents: 'none',
  },
]);

export const UploadBoardContainer = style([
  DefaultReset,
  {
    position: 'absolute',
    bottom: config.space.S200,
    left: 0,
    right: 0,
    zIndex: config.zIndex.Max,
  },
]);

export const UploadBoard = style({
  maxWidth: toRem(400),
  width: '100%',
  maxHeight: toRem(450),
  height: '100%',
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E200,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  overflow: 'hidden',
  pointerEvents: 'all',
});

export const UploadBoardHeaderContent = style({
  height: '100%',
  padding: `0 ${config.space.S200}`,
});

export const UploadBoardContent = style({
  padding: config.space.S200,
  paddingBottom: 0,
  paddingRight: 0,
});
