import { ComplexStyleRule } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { ContainerColor as TContainerColor, DefaultReset, color } from 'folds';

const getVariant = (variant: TContainerColor): ComplexStyleRule => ({
  vars: {
    backgroundColor: color[variant].Container,
    borderColor: color[variant].ContainerLine,
    outlineColor: color[variant].ContainerLine,
    color: color[variant].OnContainer,
  },
});

export const ContainerColor = recipe({
  base: [DefaultReset],
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

export type ContainerColorVariants = RecipeVariants<typeof ContainerColor>;
