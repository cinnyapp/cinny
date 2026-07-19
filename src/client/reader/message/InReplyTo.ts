import { ObjectReader } from 'neurone/lib/utils';

export class rInReplyTo {
  static eventId(inReplyTo?: object): string | undefined {
    return ObjectReader.string(inReplyTo, 'event_id');
  }
}
