// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ObjectReader } from 'neurone/lib/utils';

export class rInReplyTo {
  static eventId(inReplyTo?: object): string | undefined {
    return ObjectReader.string(inReplyTo, 'event_id');
  }
}
