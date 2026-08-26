import { ObjectReader } from 'neurone/lib/utils';

export class rRelations {
  static replace(relations?: object): object | undefined {
    return ObjectReader.object(relations, 'm.replace');
  }

  static thread(relations?: object): object | undefined {
    return ObjectReader.object(relations, 'm.thread');
  }

  static reference(relations?: object): object | undefined {
    return ObjectReader.object(relations, 'm.reference');
  }
}
