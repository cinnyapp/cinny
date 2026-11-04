// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { style } from '@vanilla-extract/css';
import { color } from 'folds';

export const UserAvatar = style({
  backgroundColor: color.Secondary.Container,
  color: color.Secondary.OnContainer,
  textTransform: 'capitalize',

  selectors: {
    '&[data-image-loaded="true"]': {
      backgroundColor: 'transparent',
    },
  },
});

export const UserAvatarImg = style({
  fontSize: 1,
});
