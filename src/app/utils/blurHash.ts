// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { encode, isBlurhashValid } from 'blurhash';

export const encodeBlurHash = (
  img: HTMLImageElement | HTMLVideoElement,
  width?: number,
  height?: number
): string | undefined => {
  const imgWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const imgHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  const canvas = document.createElement('canvas');
  canvas.width = width || imgWidth;
  canvas.height = height || imgHeight;
  const context = canvas.getContext('2d');

  if (!context) return undefined;
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  return encode(data.data, data.width, data.height, 4, 4);
};

export const validBlurHash = (hash?: string): string | undefined => {
  if (typeof hash === 'string') {
    const validity = isBlurhashValid(hash);

    return validity.result ? hash : undefined;
  }

  return undefined;
};
