import { ComplexStyleRule } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { color, config, ContainerColor, toRem } from 'folds';

const getVariant = (variant: ContainerColor): ComplexStyleRule => ({
  outlineColor: color[variant].Container,
});

export const StackedAvatar = recipe({
  base: {
    backgroundColor: color.Surface.Container,
    outlineStyle: 'solid',
    selectors: {
      '&:first-child': {
        marginLeft: 0,
      },
      'button&': {
        cursor: 'pointer',
      },
    },
  },

  variants: {
    size: {
      '200': {
        marginLeft: toRem(-6),
        outlineWidth: config.borderWidth.B300,
      },
      '300': {
        marginLeft: toRem(-9),
        outlineWidth: config.borderWidth.B400,
      },
      '400': {
        marginLeft: toRem(-10.5),
        outlineWidth: config.borderWidth.B500,
      },
      '500': {
        marginLeft: toRem(-13),
        outlineWidth: config.borderWidth.B600,
      },
    },
    variant: {
      Background: getVariant('Background'),
      Surface: getVariant('Surface'),
      SurfaceVariant: getVariant('SurfaceVariant'),
      Primary: getVariant('Primary'),
      Secondary: getVariant('Secondary'),
      Success: getVariant('Success'),
      Warning: getVariant('Warning'),
      Critical: getVariant('Critical'),
    },
  },
  defaultVariants: {
    size: '400',
    variant: 'Surface',
  },
});

export type StackedAvatarVariants = RecipeVariants<typeof StackedAvatar>;
