/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const SplashScreen = style({
  minHeight: '100%',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
});

export const SplashLogo = style({
  width: toRem(42),
  height: toRem(42),
});

export const SplashScreenFooter = style({
  padding: config.space.S400,
});
