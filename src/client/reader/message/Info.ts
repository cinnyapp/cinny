import { ObjectReader } from 'neurone/lib/utils';
import { MATRIX_BLUR_HASH_PROPERTY_NAME } from '../../../types/matrix/common';

export class rInfo {
  static mimetype(info?: object): string | undefined {
    return ObjectReader.string(info, 'mimetype');
  }

  static size(info?: object): number | undefined {
    return ObjectReader.number(info, 'size');
  }

  static duration(info?: object): number | undefined {
    return ObjectReader.number(info, 'duration');
  }

  static h(info?: object): number | undefined {
    return ObjectReader.number(info, 'h');
  }

  static w(info?: object): number | undefined {
    return ObjectReader.number(info, 'w');
  }

  static thumbnailFile(info?: object): object | undefined {
    return ObjectReader.object(info, 'thumbnail_file');
  }

  static thumbnailUrl(info?: object): string | undefined {
    return ObjectReader.string(info, 'thumbnail_url');
  }

  static thumbnailInfo(info?: object): object | undefined {
    return ObjectReader.object(info, 'thumbnail_info');
  }

  static blurhash(info?: object): string | undefined {
    return ObjectReader.string(info, MATRIX_BLUR_HASH_PROPERTY_NAME);
  }
}
