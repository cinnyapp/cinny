/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const PickerMenu = style({
  padding: config.space.S200,
});
export const PickerContainer = style({
  maxHeight: toRem(250),
});
export const PickerColumnLabel = style({
  padding: config.space.S200,
});
export const PickerColumnContent = style({
  padding: config.space.S200,
  paddingRight: 0,
});
