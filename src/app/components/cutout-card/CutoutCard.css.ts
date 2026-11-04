/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const CutoutCard = style({
  borderRadius: config.radii.R300,
  borderWidth: config.borderWidth.B300,
  overflow: 'hidden',
});
