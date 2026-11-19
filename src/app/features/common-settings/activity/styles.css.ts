/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ActivityMessage = style({
  padding: `${config.space.S100} 0`,
});

export const ActivityMessageContent = style({
  paddingTop: toRem(2),
});

export const ActivityIcon = style({
  padding: config.space.S100,
  borderRadius: config.radii.R300,
});
