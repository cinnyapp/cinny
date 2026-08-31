/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Originally obtained from:
https://github.com/matrix-org/matrix-react-sdk/blob/develop/src/utils/colour.ts
Revision: 526645c79160ab1ad4b4c3845de27d51263a405e

Modifications made:
- 2023-10-25: Martijn de Boer; removed lodash dependency
- 2025-10-29: RGBCube; ignore all forms of whitespace, use data-mx-color with span, and clean
*/

const isWhitespace = (char) => /\s/.test(char);

export const rainbow = (str: string) =>
  str.split('')
    .map((c, i) => {
      if (isWhitespace(c)) return c;

      const frequency = (2 * Math.PI) / str.length;
      const [a, b] = generateAB(i * frequency, 1);

      const [r, g, b_] = labToRGB(75, a, b);

      return `<span data-mx-color='#${r.toString(16).padStart(2, '0')}${
        g.toString(16).padStart(2, '0')
      }${b_.toString(16).padStart(2, '0')}'>${c}</span>`;
    })
    .join('');

const generateAB = (
  hue: number,
  chroma: number,
) => [chroma * 127 * Math.cos(hue), chroma * 127 * Math.sin(hue)];

const labToRGB = (l: number, a: number, b: number) => {
  // https://en.wikipedia.org/wiki/CIELAB_color_space#Reverse_transformation
  // https://en.wikipedia.org/wiki/SRGB#The_forward_transformation_(CIE_XYZ_to_sRGB)

  // Convert CIELAB to CIEXYZ (D65)
  let y = (l + 16) / 116;
  const x = adjustLocation(y + a / 500) * 0.9505;
  const z = adjustLocation(y - b / 200) * 1.089;

  y = adjustLocation(y);

  // Linear transformation from CIEXYZ to RGB
  const r = 3.24096994 * x - 1.53738318 * y - 0.49861076 * z;
  const g = -0.96924364 * x + 1.8759675 * y + 0.04155506 * z;
  const b_ = 0.05563008 * x - 0.20397696 * y + 1.05697151 * z;

  return [adjustColor(r), adjustColor(g), adjustColor(b_)];
};

const adjustLocation = (v: number) =>
  v > 0.2069 ? Math.pow(v, 3) : 0.1284 * v - 0.01771;

const adjustColor = (v: number) => {
  const gammaCorrected = v <= 0.0031308
    // Non-linear transformation to sRGB
    ? 12.92 * v
    // Normal
    : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  // Limits number between 0 and 1
  const limited = Math.min(Math.max(gammaCorrected, 0), 1);

  return Math.round(limited * 255);
};
