import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { MessageBatch } from './MessageBatch';
import { randomStr } from '../../../app/utils/common';

export type RangeInfo = {
  start: number;
  end: number;
};

export class MessageRange implements Disposable {
  public readonly disposer = new Disposer();

  public readonly info: ObservableValue<RangeInfo>;

  private readonly publishKey = randomStr();

  private oldLength: number;

  /**
   * View saves this on unmount to restore later.
   */
  public scrollTopCache: number | undefined;

  static rangeLimit = 80;

  static atLiveEnd(len: number): RangeInfo {
    return {
      start: Math.max(0, len - this.rangeLimit),
      end: len,
    };
  }

  constructor(batch: ObservableValue<MessageBatch>) {
    const len = batch.read.size;

    this.info = new ObservableValue(MessageRange.atLiveEnd(len), this.publishKey);
    this.oldLength = len;

    this.disposer.collect(batch.subscribe(this.onBatchUpdate.bind(this)));
  }

  private onBatchUpdate(batch: MessageBatch) {
    const { change, size } = batch;
    const oldLen = this.oldLength;
    this.oldLength = size;

    if (change.type === 'Grow' && change.dir === 'b') {
      const lenAdded = size - oldLen;
      this.setRange(
        oldLen === 0 && batch.next.end
          ? MessageRange.atLiveEnd(size)
          : this.adjustBackwardGrowth(lenAdded)
      );
      return;
    }
    if (change.type === 'Grow' && change.dir === 'f') {
      if (oldLen !== size && batch.next.end) {
        // keep timeline at live end and updated
        const lenAdded = size - oldLen;
        this.setRange({
          start: size <= MessageRange.rangeLimit ? 0 : lenAdded + this.info.read.start,
          end: lenAdded + this.info.read.end,
        });
      }
      return;
    }

    if (change.type === 'Shrink') {
      // NOTE: skip as we do not delete messages.
      return;
    }

    this.setRange(MessageRange.atLiveEnd(size));

    // clear the top cache since the timeline batch has changed
    this.scrollTopCache = undefined;
  }

  private adjustBackwardGrowth(lenthChange: number): RangeInfo {
    return {
      start: this.info.read.start + lenthChange,
      end: this.info.read.end + lenthChange,
    };
  }

  public setRange(info: RangeInfo) {
    this.info.publish(this.publishKey, info);
  }

  public dispose(): void {
    this.disposer.run();
  }
}
