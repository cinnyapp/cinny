import { keyframes, style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const StickySection = style({
  position: 'sticky',
  top: config.space.S100,
});

const highlightAnime = keyframes({
  '0%': {
    backgroundColor: color.Primary.Container,
  },
  '25%': {
    backgroundColor: color.Primary.ContainerActive,
  },
  '50%': {
    backgroundColor: color.Primary.Container,
  },
  '75%': {
    backgroundColor: color.Primary.ContainerActive,
  },
  '100%': {
    backgroundColor: color.Primary.Container,
  },
});

export const BaseMessage = recipe({
  base: {
    marginTop: config.space.S400,
    padding: `${config.space.S100} ${config.space.S200} ${config.space.S100} ${config.space.S400}`,
  },
  variants: {
    space: {
      '0': {
        marginTop: config.space.S0,
      },
      '100': {
        marginTop: config.space.S100,
      },
      '200': {
        marginTop: config.space.S200,
      },
      '300': {
        marginTop: config.space.S300,
      },
      '400': {
        marginTop: config.space.S400,
      },
      '500': {
        marginTop: config.space.S500,
      },
    },
    collapse: {
      true: {
        marginTop: 0,
        paddingTop: 0,
      },
    },
    highlight: {
      true: {
        animation: `${highlightAnime} 2000ms ease-in-out`,
      },
    },
  },
  defaultVariants: {
    space: '400',
  },
});

export type BaseMessageVariants = RecipeVariants<typeof BaseMessage>;

export const CompactHeader = style([
  DefaultReset,
  StickySection,
  {
    maxWidth: toRem(170),
    width: '100%',
  },
]);

export const DefaultAvatar = style({
  paddingTop: toRem(4),
  minWidth: toRem(36),
});

export const BubbleAvatar = style({
  paddingTop: toRem(4),
  minWidth: toRem(36),
});

export const BubbleContent = style({
  maxWidth: toRem(800),
  padding: `${config.space.S100} ${config.space.S200}`,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  borderRadius: config.radii.R400,
});
