// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { PackImageReader } from './PackImageReader';
import { PackImages } from './types';

export class PackImagesReader {
  private readonly rawImages: PackImages;

  private shortcodeToImages: Map<string, PackImageReader> | undefined;

  constructor(images: PackImages) {
    this.rawImages = images;
  }

  get collection(): Map<string, PackImageReader> {
    if (this.shortcodeToImages) return this.shortcodeToImages;

    const shortcodeToImages: Map<string, PackImageReader> = new Map();

    Object.entries(this.rawImages).forEach(([shortcode, image]) => {
      const imageReader = PackImageReader.fromPackImage(shortcode, image);
      if (imageReader) {
        shortcodeToImages.set(shortcode, imageReader);
      }
    });

    this.shortcodeToImages = shortcodeToImages;
    return this.shortcodeToImages;
  }
}
