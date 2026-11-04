// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const CutoutCard = style({
  borderRadius: config.radii.R300,
  borderWidth: config.borderWidth.B300,
  overflow: 'hidden',
});
