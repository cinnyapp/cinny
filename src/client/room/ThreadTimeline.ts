import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { Observable, ObservableValue } from 'neurone/lib/utils/observable';
import { getRelations, GetRelationsOK } from 'neurone/lib/api/matrix/client/v1/rooms';
import {
  getContext,
  GetContextOK,
  getEvent,
  GetEventOK,
} from 'neurone/lib/api/matrix/client/v3/rooms';
import {
  MatrixRequest,
  MatrixResponseResult,
  parseMatrixResp,
  printMatrixError,
} from 'neurone/lib/matrix-request';
import { TimelineView } from './TimelineView';
import { MessageRange, MessageBatch } from './messages';
import { TimelineBatchManager } from './TimelineBatchManager';
import { RelationsProcessor } from './relations';
import { ThreadMeta } from './ThreadMeta';
import { rRelations, rThread, rUnsigned } from '../reader';
import { TimelineUtils } from './TimelineUtils';
import { LocalEventOutbox } from './local-event/LocalEventOutbox';
import { EventSenderIdle, LocalEvent, LocalEventSender, LocalMessage } from './local-event';
import { randomStr } from '../../app/utils/common';

export type ThreadSyncData = {
  events: MessageEventWithoutRoomId[];
  limited?: boolean;
  prevToken?: string;
};

export class ThreadTimeline implements TimelineView, Disposable {
  private readonly publishKey = randomStr();

  public readonly roomId: string;

  public readonly threadId: string;

  private readonly request: MatrixRequest;

  private readonly disposer = new Disposer();

  public readonly onSync: Observable<ThreadSyncData>;

  public readonly meta: ObservableValue<ThreadMeta | undefined>;

  public readonly relations: RelationsProcessor;

  public readonly batch: ObservableValue<MessageBatch>;

  private readonly batchManager: TimelineBatchManager;

  public readonly range: MessageRange;

  public readonly outbox = new LocalEventOutbox();

  private utils: TimelineUtils;

  private paginatingBackward = false;

  private paginatingForward = false;

  constructor(
    roomId: string,
    threadId: string,
    publishKey: string,
    request: MatrixRequest,
    relations: RelationsProcessor,
    rootEvent?: MessageEventWithoutRoomId
  ) {
    this.roomId = roomId;
    this.threadId = threadId;
    this.request = request;
    // NOTE: we don't have dedicated set of relations,
    // because we do not want to recurse relations to put them in thread.
    this.relations = relations;

    this.batch = new ObservableValue(MessageBatch.emptyAtForwardEnd(), this.publishKey);
    this.batchManager = new TimelineBatchManager(this.batch, this.publishKey);
    this.range = new MessageRange(this.batch);

    this.meta = new ObservableValue(undefined, this.publishKey);
    this.onSync = new Observable(publishKey);
    this.utils = new TimelineUtils(roomId, request);

    this.disposer.collect(
      this.batch,
      this.range,
      this.meta,
      this.onSync,
      this.onSync.subscribe(this.onSyncListener.bind(this))
    );

    if (rootEvent) {
      this.processTheadMeta(rootEvent);
    } else {
      this.refreshThreadMeta();
    }
  }

  private processTheadMeta(rootEvent: MessageEventWithoutRoomId): void {
    const relations = rUnsigned.relations(rootEvent.unsigned);
    const threadRelation = rRelations.thread(relations);
    const latestReply = rThread.latestEvent(threadRelation) as
      | MessageEventWithoutRoomId
      | undefined;
    const replyCount = rThread.count(threadRelation) ?? 0;
    const currentUserParticipated = rThread.currentUserParticipated(threadRelation) ?? false;

    this.meta.publish(
      this.publishKey,
      new ThreadMeta(rootEvent, latestReply, replyCount, currentUserParticipated)
    );

    if (!latestReply) {
      this.batchManager.markTimelineStart();
    }
  }

  private async refreshThreadMeta(): Promise<void> {
    try {
      const resp = await this.request(
        getEvent({ pathParams: { roomId: this.roomId, eventId: this.threadId } })
      );
      const [err, event] = await parseMatrixResp<GetEventOK>(resp);
      if (err) {
        console.error(printMatrixError(err));
        return;
      }
      this.processTheadMeta(event);
    } catch (err) {
      console.error(err);
    }
  }

  private syncThreadMeta(events: MessageEventWithoutRoomId[]) {
    const meta = this.meta.read;
    const latestEvent = events.at(-1);
    if (!meta || !latestEvent) return;

    // TODO: need session userId to find current user participation;
    // we do not use that flag yet.
    const newMeta = new ThreadMeta(
      meta.rootEvent,
      latestEvent,
      meta.replyCount + events.length,
      meta.currentUserParticipated
    );
    this.meta.publish(this.publishKey, newMeta);
  }

  private onSyncListener(data: ThreadSyncData): void {
    const { events, limited, prevToken } = data;

    // NOTE: relations are already picked & filtered in main timeline.
    this.batchManager.handleSync(events, limited, prevToken);
    if (limited) {
      this.refreshThreadMeta();
    } else {
      this.syncThreadMeta(events);
    }

    const eventsWithRemoteEcho = this.outbox.getSentEventIds().filter((e) => this.findEvent(e));
    this.outbox.removeByEventIds(eventsWithRemoteEcho);
  }

  private async getMessages(
    token: string | undefined,
    dir: 'b' | 'f',
    limit: number
  ): Promise<MatrixResponseResult<GetRelationsOK>> {
    const resp = await this.request(
      getRelations({
        pathParams: {
          roomId: this.roomId,
          eventId: this.threadId,
        },
        searchParams: {
          dir,
          from: token,
          limit,
          recurse: true,
        },
      })
    );
    return parseMatrixResp<GetRelationsOK>(resp);
  }

  public async paginateBackward(limit: number): Promise<void> {
    if (this.paginatingBackward) return;
    this.paginatingBackward = true;

    try {
      const { id, prev, messages } = this.batch.read;
      if (prev.end) return;

      const token = prev.token ?? (await this.utils.generatePaginationToken(messages.events, 'b'));

      if (!token && messages.events.length > 0) {
        this.batchManager.markTimelineStart();
        return;
      }

      const [err, result] = await this.getMessages(token, 'b', limit);
      if (err) {
        throw new Error(printMatrixError(err));
      }

      const { next_batch: prevToken, chunk } = result;

      const messageEvents = this.relations.pickAndFilter(chunk);

      this.batchManager.handleBackwardPagination(id, messageEvents, prevToken);
    } finally {
      this.paginatingBackward = false;
    }
  }

  public async paginateForward(limit: number): Promise<void> {
    if (this.paginatingForward) return;
    this.paginatingForward = true;

    try {
      const { id, next, messages } = this.batch.read;
      if (next.end) return;

      const token = next.token ?? (await this.utils.generatePaginationToken(messages.events, 'f'));

      if (!token && messages.events.length > 0) {
        this.batchManager.markTimelineEnd();
        return;
      }

      if (!token) {
        // We do not want to fetch messages from start
        // as back pagination will fetch from live end.
        return;
      }

      const [err, result] = await this.getMessages(token, 'f', limit);
      if (err) {
        throw new Error(printMatrixError(err));
      }

      const { prev_batch: nextToken, chunk } = result;

      const messageEvents = this.relations.pickAndFilter(chunk);

      this.batchManager.handleForwardPagination(id, messageEvents, nextToken);
    } finally {
      this.paginatingForward = false;
    }
  }

  public async jumpToEvent(eventId: string): Promise<void> {
    const resp = await this.request(
      getContext({
        pathParams: {
          roomId: this.roomId,
          eventId,
        },
        searchParams: {
          limit: 0,
        },
      })
    );

    const [err, result] = await parseMatrixResp<GetContextOK>(resp);
    if (err) {
      throw new Error(printMatrixError(err));
    }
    const { event, start, end } = result;
    if (!event) {
      throw new Error(
        `Failed to jump to event! No event found for ${eventId} in room ${this.roomId}`
      );
    }

    const events = [event];
    const messageEvents: MessageEventWithoutRoomId[] = this.relations.pickAndFilter(events);

    this.batchManager.loadEvents(messageEvents, start, end);
  }

  public async jumpToLatest(): Promise<void> {
    if (this.batch.read.next.end) {
      this.range.setRange(MessageRange.atLiveEnd(this.batch.read.size));
      return;
    }

    this.batchManager.reload(MessageBatch.emptyAtForwardEnd());
  }

  public findEvent(eventId: string): MessageEventWithoutRoomId | undefined {
    return this.batch.read.messages.get(eventId);
  }

  public async sendMessage(
    originalMessage: LocalMessage,
    wireMessage: LocalMessage,
    txnId: string
  ): Promise<LocalEventSender> {
    const localEvent = new LocalEvent(originalMessage, wireMessage, txnId, Date.now());

    const sender = new LocalEventSender(localEvent, this.request);

    this.outbox.add(sender);
    if (sender.state.read instanceof EventSenderIdle) {
      sender.state.read.send();
    }

    return sender;
  }

  dispose(): void {
    this.disposer.run();
  }
}
