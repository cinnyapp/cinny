import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const ImageEditor = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const ImageEditorHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);

export const CropArea = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    height: toRem(360),
    maxHeight: '60vh',
    backgroundColor: color.Background.Container,
  },
]);

export const Controls = style([
  DefaultReset,
  {
    padding: config.space.S200,
    flexShrink: 0,
  },
]);

export const ZoomSlider = style({
  flexGrow: 1,
  minWidth: 0,
  accentColor: color.Primary.Main,
});

export const Mirrored = style({
  transform: 'scaleX(-1)',
});
