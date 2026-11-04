// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { RadiiVariant, color, config } from 'folds';

export const UploadCard = recipe({
  base: {
    padding: config.space.S300,
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderColor: color.SurfaceVariant.ContainerLine,
  },
  variants: {
    radii: RadiiVariant,
    outlined: {
      true: {
        borderStyle: 'solid',
        borderWidth: config.borderWidth.B300,
      },
    },
    compact: {
      true: {
        padding: config.space.S100,
      },
    },
  },
  defaultVariants: {
    radii: '400',
  },
});

export type UploadCardVariant = RecipeVariants<typeof UploadCard>;

export const UploadCardError = style({
  padding: `0 ${config.space.S100}`,
  color: color.Critical.Main,
});
