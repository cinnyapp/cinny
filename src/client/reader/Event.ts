import { ObjectReader } from 'neurone/lib/utils';

export class rEvent {
  static eventId(event?: object): string | undefined {
    return ObjectReader.string(event, 'event_id');
  }

  static roomId(event?: object): string | undefined {
    return ObjectReader.string(event, 'room_id');
  }

  static type(event?: object): string | undefined {
    return ObjectReader.string(event, 'type');
  }

  static stateKey(event?: object): string | undefined {
    return ObjectReader.string(event, 'state_key');
  }

  static sender(event?: object): string | undefined {
    return ObjectReader.string(event, 'sender');
  }

  static content(event?: object): object | undefined {
    return ObjectReader.object(event, 'content');
  }

  static originServerTs(event?: object): number | undefined {
    return ObjectReader.number(event, 'origin_server_ts');
  }

  static unsigned(event?: object): object | undefined {
    return ObjectReader.object(event, 'unsigned');
  }

  static redacts(event?: object): string | undefined {
    return ObjectReader.string(event, 'redacts');
  }
}
