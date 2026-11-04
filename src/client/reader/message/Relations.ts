/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
