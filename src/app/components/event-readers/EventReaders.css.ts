/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const EventReaders = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const Header = style({
  paddingLeft: config.space.S400,
  paddingRight: config.space.S300,

  flexShrink: 0,
});

export const Content = style({
  paddingLeft: config.space.S200,
  paddingBottom: config.space.S400,
});
