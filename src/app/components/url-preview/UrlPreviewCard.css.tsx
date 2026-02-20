import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';
import { DefaultReset, color, toRem } from 'folds';

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

export const UrlPreviewModal = style([
  DefaultReset,
  {
    width: '90vw',
    height: '85vh',
    maxWidth: toRem(1200),
    maxHeight: toRem(1000),
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: color.Background.Container,
  },
]);
