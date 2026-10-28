import { MatrixRequest, parseMatrixResp } from 'neurone/lib/matrix-request';
import { MessageEventWithoutRoomId, ReceiptType } from 'neurone/lib/api/types';
import { postReceiptEventId, PostReceiptEventIdOK } from 'neurone/lib/api/matrix/client/v3/rooms';
import { AsyncTaskQueue, MatrixRequestRetrier, sleep } from 'neurone/lib/utils';
import { Storage } from './storage';
import { getReadReceiptId, ReadReceiptObject } from './storage/collections';
import { ThreadId } from '../types/matrix/room';

export class ReadMarker {
  private readonly queue = new AsyncTaskQueue();

  static hasUnread = (
    receipt: ReadReceiptObject,
    event: MessageEventWithoutRoomId,
    userId: string
  ) => receipt && receipt.ts < event.origin_server_ts && event.sender !== userId;

  constructor(
    private readonly storage: Storage,
    private readonly request: MatrixRequest,
    private readonly userId: string
  ) {}

  public async markAsRead(
    roomId: string,
    receiptType: ReceiptType,
    eventId: string,
    threadId?: string
  ): Promise<void> {
    await this.queue.enqueue(() => this.read(roomId, receiptType, eventId, threadId));
  }

  private async read(
    roomId: string,
    receiptType: ReceiptType,
    eventId: string,
    threadId?: string
  ): Promise<void> {
    const retrier = new MatrixRequestRetrier(sleep);

    const endpoint = postReceiptEventId({
      pathParams: { roomId, receiptType, eventId },
      body: {
        thread_id: threadId,
      },
    });

    const response = await retrier.execute(() => this.request(endpoint));
    const [err] = await parseMatrixResp<PostReceiptEventIdOK>(response);
    if (err) {
      throw err.data.error ?? err.data.errcode ?? 'Unknown Error';
    }
    await this.updateStore(roomId, receiptType, eventId, threadId);
  }

  private async updateStore(
    roomId: string,
    receiptType: ReceiptType,
    eventId: string,
    threadId?: string
  ) {
    const id = getReadReceiptId(roomId, this.userId, threadId ?? ThreadId.Main);
    const receipt: ReadReceiptObject = {
      id,
      roomId,
      userId: this.userId,
      type: receiptType,
      eventId,
      ts: Date.now(),
      threadId: threadId ?? ThreadId.Main,
    };

    await this.storage.readReceipt.write.put(receipt);
  }
}
