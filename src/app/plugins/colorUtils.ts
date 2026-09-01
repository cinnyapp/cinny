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

export const hexToGrayscale = (hex: string): string => {
  const clean = hex.replace('#', '');

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const grayHex = gray.toString(16).padStart(2, '0');

  return `#${grayHex}${grayHex}${grayHex}`;
}