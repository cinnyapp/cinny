// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { style } from '@vanilla-extract/css';
import { color, config, FocusOutline, toRem } from 'folds';
import { ContainerColor } from '../../../../styles/ContainerColor.css';

export const ThreadSelector = style([
  ContainerColor({ variant: 'SurfaceVariant' }),
  {
    padding: config.space.S200,
    borderRadius: config.radii.R400,
    cursor: 'pointer',
    marginTop: config.space.S200,
    alignSelf: 'start',

    selectors: {
      '&:hover, &:focus-visible': {
        backgroundColor: color.SurfaceVariant.ContainerHover,
      },
      '&:active': {
        backgroundColor: color.SurfaceVariant.ContainerActive,
      },
    },
  },
  FocusOutline,
]);

export const ThreadSectorOutlined = style({
  borderWidth: config.borderWidth.B300,
});

export const ThreadSelectorDivider = style({
  height: toRem(16),
});
