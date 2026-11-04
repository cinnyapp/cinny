/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ObjectReader } from 'neurone/lib/utils';

export class rUnsigned {
  static relations(unsigned?: object): object | undefined {
    return ObjectReader.object(unsigned, 'm.relations');
  }

  static age(unsigned?: object): number | undefined {
    return ObjectReader.number(unsigned, 'age');
  }

  static membership(unsigned?: object): string | undefined {
    return ObjectReader.string(unsigned, 'membership');
  }

  static prevContent(unsigned?: object): object | undefined {
    return ObjectReader.object(unsigned, 'prev_content');
  }

  static redactedBecause(unsigned?: object): object | undefined {
    return ObjectReader.object(unsigned, 'redacted_because');
  }

  static transactionId(unsigned?: object): string | undefined {
    return ObjectReader.string(unsigned, 'transaction_id');
  }
}
