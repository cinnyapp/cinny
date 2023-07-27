import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const StickySection = style({
  position: 'sticky',
  top: config.space.S100,
});

export const Compact = recipe({
  base: {
    padding: `${config.space.S100} ${config.space.S400}`,
  },
  variants: {
    collapse: {
      true: {
        paddingTop: 0,
      },
    },
  },
});

export const CompactHeader = style([
  DefaultReset,
  StickySection,
  {
    maxWidth: toRem(170),
    width: '100%',
  },
]);

export const Default = recipe({
  base: {
    padding: `${config.space.S200} ${config.space.S200} ${config.space.S200} ${config.space.S400}`,
  },
  variants: {
    collapse: {
      true: {
        paddingTop: 0,
      },
    },
  },
});

export const DefaultAvatar = style({
  paddingTop: toRem(4),
  minWidth: toRem(36),
});

export const Bubble = recipe({
  base: {
    padding: `${config.space.S200} ${config.space.S200} ${config.space.S200} ${config.space.S400}`,
  },
  variants: {
    collapse: {
      true: {
        paddingTop: 0,
      },
    },
  },
});

export const BubbleAvatar = style({
  paddingTop: toRem(4),
  minWidth: toRem(36),
});

export const BubbleContent = style({
  padding: `${config.space.S100} ${config.space.S200}`,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  borderRadius: config.radii.R400,
});
