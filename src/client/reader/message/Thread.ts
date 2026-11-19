/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ObjectReader } from 'neurone/lib/utils';

export class rThread {
  static latestEvent(thread?: object): object | undefined {
    return ObjectReader.object(thread, 'latest_event');
  }

  static count(thread?: object): number | undefined {
    return ObjectReader.number(thread, 'count');
  }

  static currentUserParticipated(thread?: object): boolean | undefined {
    return ObjectReader.boolean(thread, 'current_user_participated');
  }
}
