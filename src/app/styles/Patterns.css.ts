/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';

export const BackgroundDotPattern = style({
  backgroundImage: `radial-gradient(${color.Background.ContainerActive} ${toRem(2)}, ${
    color.Background.Container
  } ${toRem(2)})`,
  backgroundSize: `${toRem(40)} ${toRem(40)}`,
});
