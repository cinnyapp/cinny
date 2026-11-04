// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import chroma from 'chroma-js';
import { ThemeKind } from '../hooks/useTheme';

export const accessibleColor = (themeKind: ThemeKind, color: string): string => {
  if (!chroma.valid(color)) return color;

  let lightness = chroma(color).lab()[0];
  if (themeKind === ThemeKind.Dark && lightness < 60) {
    lightness = 60;
  }
  if (themeKind === ThemeKind.Light && lightness > 50) {
    lightness = 50;
  }

  return chroma(color).set('lab.l', lightness).hex();
};
