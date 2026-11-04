// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ObjectReader } from 'neurone/lib/utils';
import { MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../types/matrix/common';

export class rThumbnailInfo {
  static mimetype(thumbInfo?: object): string | undefined {
    return ObjectReader.string(thumbInfo, 'mimetype');
  }

  static size(thumbInfo?: object): number | undefined {
    return ObjectReader.number(thumbInfo, 'size');
  }

  static h(thumbInfo?: object): number | undefined {
    return ObjectReader.number(thumbInfo, 'h');
  }

  static w(thumbInfo?: object): number | undefined {
    return ObjectReader.number(thumbInfo, 'w');
  }

  static blurhash(info?: object): string | undefined {
    return ObjectReader.string(info, MATRIX_BLUR_HASH_PROPERTY_NAME);
  }
}
