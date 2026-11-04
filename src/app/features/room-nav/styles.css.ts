// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

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
      borderLeft: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,

      position: 'absolute',
      top: 0,
      left: toRem(-8),
      bottom: toRem(22),
    },
  },
});

export const ThreadNavItem = style({
  position: 'relative',
  minHeight: toRem(30),

  selectors: {
    '&::before': {
      content: '',
      display: 'block',
      border: `0 solid ${color.Background.ContainerLine}`,
      borderLeftWidth: config.borderWidth.B300,
      borderBottomWidth: config.borderWidth.B300,

      borderBottomLeftRadius: toRem(4),
      width: toRem(8),
      height: toRem(8),

      position: 'absolute',
      top: '50%',
      left: toRem(-8),
      transform: `translateY(calc(-50% - ${toRem(4)}))`,
    },
  },
});
