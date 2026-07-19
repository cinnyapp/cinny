import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';

export class ThreadMeta {
  public readonly latestEvent: MessageEventWithoutRoomId;

  public readonly count: number;

  public readonly currentUserParticipated: boolean;

  constructor(
    latestEvent: MessageEventWithoutRoomId,
    count: number,
    currentUserParticipated: boolean
  ) {
    this.latestEvent = latestEvent;
    this.count = count;
    this.currentUserParticipated = currentUserParticipated;
  }
}
