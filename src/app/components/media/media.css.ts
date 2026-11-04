// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { style } from '@vanilla-extract/css';
import { DefaultReset } from 'folds';

export const Image = style([
  DefaultReset,
  {
    objectFit: 'cover',
    width: '100%',
    height: '100%',
  },
]);

export const Video = style([
  DefaultReset,
  {
    objectFit: 'contain',
    width: '100%',
    height: '100%',
  },
]);
