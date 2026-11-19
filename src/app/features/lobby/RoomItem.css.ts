/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const RoomItemCard = style({
  padding: config.space.S400,
  borderRadius: 0,
  position: 'relative',
  selectors: {
    '&[data-dragging=true]': {
      opacity: config.opacity.Disabled,
    },
  },
});
export const RoomProfileTopic = style({
  cursor: 'pointer',
  ':hover': {
    textDecoration: 'underline',
  },
});
export const ErrorNameContainer = style({
  gap: toRem(2),
});
