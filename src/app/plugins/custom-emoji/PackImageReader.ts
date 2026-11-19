/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { IImageInfo } from '../../../types/matrix/common';
import { ImageUsage, PackImage } from './types';

export class PackImageReader {
  public readonly shortcode: string;

  public readonly url: string;

  private readonly image: Omit<PackImage, 'url'>;

  constructor(shortcode: string, url: string, image: Omit<PackImage, 'url'>) {
    this.shortcode = shortcode;
    this.url = url;

    this.image = image;
  }

  static fromPackImage(shortcode: string, image: PackImage): PackImageReader | undefined {
    const { url } = image;

    if (typeof url !== 'string') return undefined;

    return new PackImageReader(shortcode, url, image);
  }

  get body(): string | undefined {
    const { body } = this.image;
    return typeof body === 'string' ? body : undefined;
  }

  get info(): IImageInfo | undefined {
    return this.image.info;
  }

  get usage(): ImageUsage[] | undefined {
    const usg = this.image.usage;
    if (!Array.isArray(usg)) return undefined;

    const knownUsage = usg.filter((u) => u === ImageUsage.Emoticon || u === ImageUsage.Sticker);

    return knownUsage.length > 0 ? knownUsage : undefined;
  }

  get content(): PackImage {
    return {
      url: this.url,
      body: this.image.body,
      usage: this.image.usage,
      info: this.image.info,
    };
  }
}
