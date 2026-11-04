// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const PinMenu = style({
  display: 'flex',
  maxWidth: toRem(548),
  width: '100vw',
  maxHeight: '90vh',
});

export const PinMenuHeader = style({
  paddingLeft: config.space.S400,
  paddingRight: config.space.S200,
});

export const PinMenuContent = style({
  paddingLeft: config.space.S200,
});
