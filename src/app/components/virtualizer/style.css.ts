/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { DefaultReset } from 'folds';

export const VirtualTile = style([
  DefaultReset,
  {
    position: 'absolute',
    width: '100%',
    left: 0,
  },
]);
