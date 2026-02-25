import { ComplexStyleRule } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { color, DefaultReset, MainColor } from 'folds';

const getVariant = (variant: MainColor): ComplexStyleRule => ({
  vars: {
    color: color[variant].Main,
  },
  selectors: {
    '&:hover': {
      color: color[variant].MainHover,
    },
  },
});

export const EventActionButton = recipe({
  base: [
    DefaultReset,
    {
      ':hover': {
        textDecoration: 'underline',
      },
      cursor: 'pointer',
    },
  ],
  variants: {
    variant: {
      Primary: getVariant('Primary'),
      Secondary: getVariant('Secondary'),
      Success: getVariant('Success'),
      Warning: getVariant('Warning'),
      Critical: getVariant('Critical'),
    },
  },
  defaultVariants: {
    variant: 'Primary',
  },
});
