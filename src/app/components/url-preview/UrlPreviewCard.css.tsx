import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const UrlPreviewAudio = style([
  DefaultReset,
  {
    padding: config.space.S300,
    paddingTop: 0,
  },
]);

export const UrlPreviewHolderGradient = recipe({
  base: [
    DefaultReset,
    {
      position: 'absolute',
      height: '100%',
      width: toRem(10),
      zIndex: 1,
    },
  ],
  variants: {
    position: {
      Left: {
        left: 0,
        background: `linear-gradient(to right,${color.Surface.Container} , rgba(116,116,116,0))`,
      },
      Right: {
        right: 0,
        background: `linear-gradient(to left,${color.Surface.Container} , rgba(116,116,116,0))`,
      },
    },
  },
});
export const UrlPreviewHolderBtn = recipe({
  base: [
    DefaultReset,
    {
      position: 'absolute',
      zIndex: 1,
    },
  ],
  variants: {
    position: {
      Left: {
        left: 0,
        transform: 'translateX(-25%)',
      },
      Right: {
        right: 0,
        transform: 'translateX(25%)',
      },
    },
  },
});
