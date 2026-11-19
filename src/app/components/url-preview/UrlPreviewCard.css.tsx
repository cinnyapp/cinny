/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { recipe } from '@vanilla-extract/recipes';
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
