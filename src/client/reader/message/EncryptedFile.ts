import { ObjectReader } from 'neurone/lib/utils';

export class rEncryptedFile {
  static url(encFile?: object): string | undefined {
    return ObjectReader.string(encFile, 'url');
  }
}
