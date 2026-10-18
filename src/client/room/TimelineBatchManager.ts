import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { MessageBatch, Messages, BatchInfo, BatchChange } from './messages';
import { randomStr } from '../../app/utils/common';

export class TimelineBatchManager {
  private readonly publishKey: string;

  private readonly batch: ObservableValue<MessageBatch>;

  constructor(batch: ObservableValue<MessageBatch>, publishKey: string) {
    this.batch = batch;
    this.publishKey = publishKey;
  }

  public handleSync(
    messageEvents: MessageEventWithoutRoomId[],
    limited: boolean | undefined,
    prevToken: string | undefined
  ): void {
    if (!limited && messageEvents.length === 0) return;

    // Skip if timeline is not at live end
    if (!this.batch.read.next.end) return;

    const { id, prev, next, messages } = this.batch.read;
    const liveEmpty = next.end && this.batch.read.size === 0;
    const mergeable = limited ? messages.overlap(messageEvents) || liveEmpty : undefined;

    if (limited && !mergeable) {
      this.batch.publish(
        this.publishKey,
        new MessageBatch(
          randomStr(),
          this.batch.read.messages,
          this.batch.read.prev,
          new BatchInfo(undefined, false),
          this.batch.read.change
        )
      );
      return;
    }

    const newPrev =
      !prev.end && !prev.token && messages.events.length === 0
        ? new BatchInfo(prevToken, !prevToken)
        : prev;

    const newBatch = new MessageBatch(
      id,
      messages.mergeFork(messageEvents),
      newPrev,
      next.end ? next : new BatchInfo(undefined, true),
      new BatchChange('Grow', 'f')
    );
    this.batch.publish(this.publishKey, newBatch);
  }

  public handleBackwardPagination(
    batchId: string,
    messageEvents: MessageEventWithoutRoomId[],
    prevToken: string | undefined
  ): void {
    if (batchId !== this.batch.read.id) {
      return;
    }

    const newBatch = new MessageBatch(
      this.batch.read.id,
      this.batch.read.messages.mergeFork(messageEvents),
      new BatchInfo(prevToken, !prevToken),
      this.batch.read.next,
      new BatchChange('Grow', 'b')
    );
    this.batch.publish(this.publishKey, newBatch);
  }

  public handleForwardPagination(
    batchId: string,
    messageEvents: MessageEventWithoutRoomId[],
    nextToken: string | undefined
  ): void {
    if (batchId !== this.batch.read.id) {
      return;
    }

    const newBatch = new MessageBatch(
      this.batch.read.id,
      this.batch.read.messages.mergeFork(messageEvents),
      this.batch.read.prev,
      new BatchInfo(nextToken, !nextToken),
      new BatchChange('Grow', 'f')
    );
    this.batch.publish(this.publishKey, newBatch);
  }

  public markTimelineStart(): void {
    const newBatch = new MessageBatch(
      this.batch.read.id,
      this.batch.read.messages,
      new BatchInfo(undefined, true),
      this.batch.read.next,
      new BatchChange('Grow', 'b')
    );
    this.batch.publish(this.publishKey, newBatch);
  }

  public markTimelineEnd(): void {
    const newBatch = new MessageBatch(
      this.batch.read.id,
      this.batch.read.messages,
      this.batch.read.prev,
      new BatchInfo(undefined, true),
      new BatchChange('Grow', 'f')
    );
    this.batch.publish(this.publishKey, newBatch);
  }

  public loadEvents(events: MessageEventWithoutRoomId[], prevToken?: string, nextToken?: string) {
    const newBatch = new MessageBatch(
      randomStr(),
      new Messages(events),
      new BatchInfo(prevToken, !prevToken),
      new BatchInfo(nextToken, !nextToken),
      new BatchChange()
    );

    this.batch.publish(this.publishKey, newBatch);
  }

  public reload(batch: MessageBatch) {
    this.batch.publish(this.publishKey, batch);
  }
}
