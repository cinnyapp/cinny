// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ObjectReader } from 'neurone/lib/utils';

export class rMentions {
  static userIds(mentions?: object): string[] | undefined {
    return ObjectReader.array(mentions, 'user_ids')?.filter((id) => typeof id === 'string');
  }

  static room(mentions?: object): boolean | undefined {
    return ObjectReader.boolean(mentions, 'room');
  }
}
