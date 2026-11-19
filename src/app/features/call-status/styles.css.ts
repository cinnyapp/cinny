/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const LiveChipText = style({
  color: color.Critical.Main,
});

export const CallStatus = style([
  {
    padding: `${toRem(6)} ${config.space.S200}`,
    borderTop: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
  },
]);

export const ControlDivider = style({
  height: toRem(16),
});

export const SpeakerAvatarOutline = style({
  boxShadow: `0 0 0 ${config.borderWidth.B600} ${color.Success.Main}`,
});
