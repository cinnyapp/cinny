/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const RelativeBase = style([
  DefaultReset,
  {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
]);

export const AbsoluteContainer = style([
  DefaultReset,
  {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
]);

export const AbsoluteFooter = style([
  DefaultReset,
  {
    position: 'absolute',
    pointerEvents: 'none',
    bottom: config.space.S100,
    left: config.space.S100,
    right: config.space.S100,
  },
]);

export const Blur = style([
  DefaultReset,
  {
    filter: 'blur(44px)',
  },
]);

export const MediaBackdrop = style([
  AbsoluteContainer,
  {
    cursor: 'pointer',
  },
]);

export const WatchButton = style({
  width: '4rem',
  height: '4rem',
  color: 'white',
  opacity: 0.6,
  transition: 'opacity 0.25s',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  selectors: {
    [`${MediaBackdrop}:hover &`]: {
      opacity: 0.8,
    },
  },
});
