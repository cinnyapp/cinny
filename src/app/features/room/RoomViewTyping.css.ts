/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { keyframes, style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

const SlideUpAnime = keyframes({
  from: {
    transform: 'translateY(100%)',
  },
  to: {
    transform: 'translateY(0)',
  },
});

export const RoomViewTyping = style([
  DefaultReset,
  {
    padding: `0 0 0 ${config.space.S500}`,
    width: '100%',
    color: color.Surface.OnContainer,
    position: 'absolute',
    bottom: `calc(-1 * ${config.space.S600})`,
    animation: `${SlideUpAnime} 100ms ease-in-out`,
  },
]);
export const TypingText = style({
  flexGrow: 1,
});
