import { ObjectReader } from 'neurone/lib/utils';

export class rError {
  static error(data?: object): string | undefined {
    return ObjectReader.string(data, 'error');
  }

  static errcode(data?: object): string | undefined {
    return ObjectReader.string(data, 'errcode');
  }

  static retryAfterMs(data?: object): number | undefined {
    return ObjectReader.number(data, 'retry_after_ms');
  }
}
