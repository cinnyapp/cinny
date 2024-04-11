import { ComplexStyleRule } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { ContainerColor, color } from 'folds';

const getVariant = (variant: ContainerColor): ComplexStyleRule => ({
  backgroundColor: color[variant].Container,
  color: color[variant].OnContainer,
});

export const RoomAvatar = recipe({
  base: {
    selectors: {
      '&[data-image-loaded="true"]': {
        backgroundColor: 'transparent',
      },
    },
  },
  variants: {
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
    variant: 'Surface',
  },
});

export type RoomAvatarVariants = RecipeVariants<typeof RoomAvatar>;
