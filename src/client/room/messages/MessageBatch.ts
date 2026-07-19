import { BatchChange } from './BatchChange';
import { BatchInfo } from './BatchInfo';
import { Messages } from '.';

export class MessageBatch {
  public readonly id: string;

  public readonly messages: Messages;

  public readonly prev: BatchInfo;

  public readonly next: BatchInfo;

  public readonly change: BatchChange;

  static emptyAtForwardEnd(): MessageBatch {
    return new MessageBatch(
      crypto.randomUUID(),
      new Messages([]),
      new BatchInfo(),
      new BatchInfo(undefined, true),
      new BatchChange()
    );
  }

  constructor(
    id: string,
    messages: Messages,
    prev: BatchInfo,
    next: BatchInfo,
    change: BatchChange
  ) {
    this.id = id;
    this.messages = messages;
    this.prev = prev;
    this.next = next;
    this.change = change;
  }

  get size(): number {
    return this.messages.events.length;
  }
}
