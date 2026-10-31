import to from 'await-to-js';
import { MatrixRequest, parseMatrixResp } from 'neurone/lib/matrix-request';
import { MessageEventWithoutRoomId, ReceiptType } from 'neurone/lib/api/types';
import {
  getMessages,
  GetMessagesOK,
  postReceiptEventId,
  PostReceiptEventIdOK,
} from 'neurone/lib/api/matrix/client/v3/rooms';
import { AsyncTaskQueue, MatrixRequestRetrier, sleep } from 'neurone/lib/utils';
import { getRelationsRelType } from 'neurone/lib/api/matrix/client/v1/rooms';
import { Storage } from './storage';
import { getReadReceiptId, ReadReceiptObject } from './storage/collections';
import { ThreadId } from '../types/matrix/room';
import { RelationType } from '../types/matrix/common';

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

    const [, latestEventId] = await to(this.fetchTrueLatestEventId(roomId, threadId));

    const endpoint = postReceiptEventId({
      pathParams: { roomId, receiptType, eventId: latestEventId ?? eventId },
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

  // fetch the actual latest event from the server.
  // our store JoinRoomLatestEvent only keep event that
  // we render in timeline, and it might not be the true latest event
  private async fetchTrueLatestEventId(
    roomId: string,
    threadId?: string
  ): Promise<string | undefined> {
    const resp = await this.request(
      threadId
        ? getRelationsRelType({
            pathParams: {
              roomId,
              eventId: threadId,
              relType: RelationType.Thread,
            },
            searchParams: {
              dir: 'b',
              limit: 1,
            },
          })
        : getMessages({
            pathParams: { roomId },
            searchParams: { limit: 1, dir: 'b' },
          })
    );
    const [err, result] = await parseMatrixResp<GetMessagesOK>(resp);
    if (err) return undefined;

    const latestEvent = result.chunk.pop();
    return latestEvent?.event_id;
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
