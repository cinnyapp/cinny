// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ComplexStyleRule } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { ContainerColor as TContainerColor, DefaultReset, color, config } from 'folds';

const getVariant = (variant: TContainerColor): ComplexStyleRule => ({
  vars: {
    backgroundColor: color[variant].Container,
    borderColor: color[variant].ContainerLine,
    outlineColor: color[variant].ContainerLine,
    color: color[variant].OnContainer,
  },
  selectors: {
    'button&[aria-pressed=true]': {
      backgroundColor: color[variant].ContainerActive,
    },
    'button&:hover, &:focus-visible': {
      backgroundColor: color[variant].ContainerHover,
    },
    'button&:active': {
      backgroundColor: color[variant].ContainerActive,
    },
    'button&[disabled]': {
      opacity: config.opacity.Disabled,
    },
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
