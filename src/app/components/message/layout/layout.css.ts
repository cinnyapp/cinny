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

export const MessageBase = recipe({
  base: [
    DefaultReset,
    {
      marginTop: config.space.S400,
      padding: `${config.space.S100} ${config.space.S200} ${config.space.S100} ${config.space.S400}`,
    },
  ],
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

export type MessageBaseVariants = RecipeVariants<typeof MessageBase>;

export const CompactHeader = style([
  DefaultReset,
  StickySection,
  {
    maxWidth: toRem(170),
    width: '100%',
  },
]);

export const ModernAvatar = style({
  paddingTop: toRem(4),
  minWidth: toRem(36),
  cursor: 'pointer',
  transition: 'transform 200ms cubic-bezier(0, 0.8, 0.67, 0.97)',

  selectors: {
    '&:hover': {
      transform: `translateY(${toRem(-4)})`,
    },
  },
});

export const BubbleAvatar = style([ModernAvatar]);

export const BubbleContent = style({
  maxWidth: toRem(800),
  padding: config.space.S200,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  borderRadius: config.radii.R400,
});
