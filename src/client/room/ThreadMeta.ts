import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';

export class ThreadMeta {
  constructor(
    public readonly rootEvent: MessageEventWithoutRoomId,
    public readonly latestReplyEvent: MessageEventWithoutRoomId | undefined,
    public readonly replyCount: number,
    public readonly currentUserParticipated: boolean
  ) {}
}
