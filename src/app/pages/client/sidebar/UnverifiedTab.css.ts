/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { keyframes, style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';

const pushRight = keyframes({
  from: {
    transform: `translateX(${toRem(2)}) scale(1)`,
  },
  to: {
    transform: 'translateX(0) scale(1)',
  },
});

export const UnverifiedTab = style({
  animationName: pushRight,
  animationDuration: '400ms',
  animationIterationCount: 30,
  animationDirection: 'alternate',
});

export const UnverifiedAvatar = style({
  backgroundColor: color.Critical.Container,
  color: color.Critical.OnContainer,
  borderColor: color.Critical.ContainerLine,
});

export const UnverifiedOtherAvatar = style({
  backgroundColor: color.Warning.Container,
  color: color.Warning.OnContainer,
  borderColor: color.Warning.ContainerLine,
});
