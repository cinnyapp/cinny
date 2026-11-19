/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';

export class ThreadMeta {
  constructor(
    public readonly rootEvent: MessageEventWithoutRoomId,
    public readonly latestReplyEvent: MessageEventWithoutRoomId | undefined,
    public readonly replyCount: number,
    public readonly currentUserParticipated: boolean
  ) {}
}
