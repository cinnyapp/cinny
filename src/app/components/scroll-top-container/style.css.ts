/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { keyframes, style } from '@vanilla-extract/css';
import { config } from 'folds';

const ScrollContainerAnime = keyframes({
  '0%': {
    transform: `translate(-50%, -100%) scale(0)`,
  },
  '100%': {
    transform: `translate(-50%, 0) scale(1)`,
  },
});

export const ScrollTopContainer = style({
  position: 'absolute',
  top: config.space.S200,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: config.zIndex.Z100,
  animation: `${ScrollContainerAnime} 100ms`,
});
