/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const LobbyHeroTopic = style({
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',

  ':hover': {
    cursor: 'pointer',
    opacity: config.opacity.P500,
    textDecoration: 'underline',
  },
});
