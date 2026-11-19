/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const CategoryButton = style({
  flexGrow: 1,
});
export const CategoryButtonIcon = style({
  opacity: config.opacity.P400,
});

export const ThreadNavItems = style({
  marginLeft: toRem(27.5),
  marginBottom: config.space.S100,

  position: 'relative',

  selectors: {
    '&::before': {
      content: '',
      display: 'block',
      borderLeft: `${config.borderWidth.B500} solid ${color.Background.ContainerLine}`,

      position: 'absolute',
      top: 0,
      left: toRem(-8),
      bottom: toRem(20),
    },
  },
});

export const ThreadNavItem = style({
  position: 'relative',
  minHeight: toRem(28),
  paddingLeft: toRem(4),

  selectors: {
    '&::before': {
      content: '',
      display: 'block',
      border: `0 solid ${color.Background.ContainerLine}`,
      borderLeftWidth: config.borderWidth.B500,
      borderBottomWidth: config.borderWidth.B500,

      borderBottomLeftRadius: toRem(4),
      width: toRem(8),
      height: toRem(8),

      position: 'absolute',
      top: '50%',
      left: toRem(-8),
      transform: `translateY(calc(-50% - ${toRem(3)}))`,
    },
  },
});

export const ThreadViewMoreChip = style({
  marginLeft: toRem(8),
  marginBottom: config.space.S200,
});
