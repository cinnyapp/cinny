import { ObjectReader } from 'neurone/lib/utils';

export class rRelatesTo {
  static relType(relatesTo?: object): string | undefined {
    return ObjectReader.string(relatesTo, 'rel_type');
  }

  static eventId(relatesTo?: object): string | undefined {
    return ObjectReader.string(relatesTo, 'event_id');
  }

  static key(relatesTo?: object): string | undefined {
    return ObjectReader.string(relatesTo, 'key');
  }

  static isFallingBack(relatesTo?: object): boolean | undefined {
    return ObjectReader.boolean(relatesTo, 'is_falling_back');
  }

  static inReplyTo(relatesTo?: object): object | undefined {
    return ObjectReader.object(relatesTo, 'm.in_reply_to');
  }
}
