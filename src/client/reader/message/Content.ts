import { ObjectReader } from 'neurone/lib/utils';
import {
  MATRIX_SPOILER_PROPERTY_NAME,
  MATRIX_SPOILER_REASON_PROPERTY_NAME,
} from '../../../types/matrix/common';

export class rContent {
  static msgtype(content: object): string | undefined {
    return ObjectReader.string(content, 'msgtype');
  }

  static body(content: object): string | undefined {
    return ObjectReader.string(content, 'body');
  }

  static format(content: object): string | undefined {
    return ObjectReader.string(content, 'format');
  }

  static formattedBody(content: object): string | undefined {
    return ObjectReader.string(content, 'formatted_body');
  }

  static mentions(content: object): object | undefined {
    return ObjectReader.object(content, 'm.mentions');
  }

  static relatesTo(content: object): object | undefined {
    return ObjectReader.object(content, 'm.relates_to');
  }

  static shortcode(content: object): string | undefined {
    return ObjectReader.string(content, 'shortcode');
  }

  static url(content: object): string | undefined {
    return ObjectReader.string(content, 'url');
  }

  static filename(content: object): string | undefined {
    return ObjectReader.string(content, 'filename');
  }

  static geoUri(content: object): string | undefined {
    return ObjectReader.string(content, 'geo_uri');
  }

  static info(content: object): object | undefined {
    return ObjectReader.object(content, 'info');
  }

  static file(content: object): object | undefined {
    return ObjectReader.object(content, 'file');
  }

  static newContent(content: object): object | undefined {
    return ObjectReader.object(content, 'm.new_content');
  }

  static redacts(content: object): string | undefined {
    return ObjectReader.string(content, 'redacts');
  }

  static reason(content: object): string | undefined {
    return ObjectReader.string(content, 'reason');
  }

  static spoiler(content: object): boolean | undefined {
    return ObjectReader.boolean(content, MATRIX_SPOILER_PROPERTY_NAME);
  }

  static spoilerReason(content: object): string | undefined {
    return ObjectReader.string(content, MATRIX_SPOILER_REASON_PROPERTY_NAME);
  }
}
