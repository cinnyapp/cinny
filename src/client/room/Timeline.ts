import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { Observable, ObservableValue } from 'neurone/lib/utils/observable';
import { JoinRoom } from 'neurone/lib/api/matrix/client/v3/sync';
import {
  getContext,
  GetContextOK,
  getMessages,
  GetMessagesOK,
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
import { ThreadTimeline } from './ThreadTimeline';
import { getMessagesFilter } from '../filter';
import { rRelations, rUnsigned } from '../reader';
import { getThreadId } from '../../app/utils/room';
import { TimelineUtils } from './TimelineUtils';
import { EventSenderIdle, LocalEvent, LocalEventSender, LocalMessage } from './local-event';
import { LocalEventOutbox } from './local-event/LocalEventOutbox';
import { randomStr } from '../../app/utils/common';

export class Timeline implements TimelineView, Disposable {
  private readonly publishKey = randomStr();

  public readonly roomId: string;

  private readonly request: MatrixRequest;

  private readonly disposer: Disposer = new Disposer();

  private readonly msgFilter: string = JSON.stringify(getMessagesFilter());

  public readonly onSync: Observable<JoinRoom>;

  public readonly relations: RelationsProcessor;

  public readonly batch: ObservableValue<MessageBatch>;

  private readonly batchManager: TimelineBatchManager;

  public readonly range: MessageRange;

  public readonly outbox = new LocalEventOutbox();

  public readonly threads: ObservableValue<Map<string, ThreadTimeline>> = new ObservableValue(
    new Map(),
    this.publishKey
  );

  public readonly activeThread = new ObservableValue<string | undefined>(
    undefined,
    this.publishKey
  );

  private utils: TimelineUtils;

  private paginatingBackward = false;

  private paginatingForward = false;

  constructor(roomId: string, publishKey: string, request: MatrixRequest) {
    this.roomId = roomId;
    this.request = request;
    this.relations = new RelationsProcessor();

    this.batch = new ObservableValue(MessageBatch.emptyAtForwardEnd(), this.publishKey);
    this.batchManager = new TimelineBatchManager(this.batch, this.publishKey);
    this.range = new MessageRange(this.batch);

    this.onSync = new Observable(publishKey);
    this.utils = new TimelineUtils(roomId, request);

    this.disposer.collect(
      this.range,
      this.relations,
      this.batch,
      () => {
        this.threads.read.forEach((thread) => thread.dispose());
        this.threads.dispose();
      },
      this.activeThread,
      this.onSync,
      this.onSync.subscribe(this.onSyncListener.bind(this))
    );
  }

  private onSyncListener(joinRoom: JoinRoom): void {
    const { events, limited, prev_batch: prevToken } = joinRoom.timeline ?? {};

    const messageEvents: MessageEventWithoutRoomId[] = events
      ? this.relations.pickAndFilter(events)
      : [];

    queueMicrotask(() => this.syncThreads(messageEvents, limited, prevToken));

    this.batchManager.handleSync(messageEvents, limited, prevToken);

    const eventsWithRemoteEcho = this.outbox.getSentEventIds().filter((e) => this.findEvent(e));
    this.outbox.removeByEventIds(eventsWithRemoteEcho);
  }

  private syncThreads(
    messageEvents: MessageEventWithoutRoomId[],
    limited: boolean | undefined,
    prevToken: string | undefined
  ): void {
    const threadIdToEvents = new Map<string, MessageEventWithoutRoomId[]>();

    messageEvents.forEach((event) => {
      const threadId = getThreadId(event);

      if (threadId) {
        const threadEvents = threadIdToEvents.get(threadId) ?? [];
        threadEvents.push(event);
        threadIdToEvents.set(threadId, threadEvents);
      }
    });

    threadIdToEvents.forEach((events, threadId) => {
      const thread: ThreadTimeline =
        this.threads.read.get(threadId) ??
        new ThreadTimeline(this.roomId, threadId, this.publishKey, this.request, this.relations);

      thread.onSync.publish(this.publishKey, { events, limited, prevToken });
      thread.paginateBackward(20);

      if (!this.threads.read.has(threadId)) {
        this.addThread(thread);
      }
    });
  }

  private addThread(thread: ThreadTimeline): void {
    const newThreads = new Map(this.threads.read);
    newThreads.set(thread.threadId, thread);
    this.threads.publish(this.publishKey, newThreads);
  }

  private pickThreads(events: MessageEventWithoutRoomId[]): void {
    const threadRoots = new Map<string, MessageEventWithoutRoomId | undefined>();

    events.forEach((event) => {
      const threadId = getThreadId(event);
      if (threadId) {
        threadRoots.set(threadId, undefined);
        return;
      }

      const relations = rUnsigned.relations(event.unsigned);
      const threadRelations = rRelations.thread(relations);
      if (threadRelations) {
        threadRoots.set(event.event_id, event);
      }
    });

    threadRoots.forEach((event, threadId) => {
      if (this.threads.read.has(threadId)) return;

      const thread = new ThreadTimeline(
        this.roomId,
        threadId,
        this.publishKey,
        this.request,
        this.relations,
        event
      );
      thread.paginateBackward(20);
      this.addThread(thread);
    });
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

      const { end: prevToken, chunk } = result;
      const messageEvents: MessageEventWithoutRoomId[] = this.relations.pickAndFilter(chunk);

      this.pickThreads(messageEvents);

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

      const { end: nextToken, chunk } = result;
      const messageEvents: MessageEventWithoutRoomId[] = this.relations.pickAndFilter(chunk);

      this.pickThreads(messageEvents);

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
          limit: 20,
          filter: this.msgFilter,
        },
      })
    );

    const [err, result] = await parseMatrixResp<GetContextOK>(resp);
    if (err) {
      throw new Error(printMatrixError(err));
    }
    const { event, events_before: before, events_after: after, start, end } = result;
    if (!event) {
      throw new Error(
        `Failed to jump to event! No event found for ${eventId} in room ${this.roomId}`
      );
    }

    const events = [...(before ?? []), event, ...(after ?? [])];
    const messageEvents: MessageEventWithoutRoomId[] = this.relations.pickAndFilter(events);

    this.pickThreads(messageEvents);
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

  private async getMessages(
    token: string | undefined,
    dir: 'b' | 'f',
    limit: number
  ): Promise<MatrixResponseResult<GetMessagesOK>> {
    const msgResp = await this.request(
      getMessages({
        pathParams: { roomId: this.roomId },
        searchParams: {
          dir,
          from: token,
          limit,
          filter: this.msgFilter,
        },
      })
    );
    return parseMatrixResp<GetMessagesOK>(msgResp);
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

  public openThread(threadId: string): void {
    const threadRoot = this.findEvent(threadId);
    if (!this.threads.read.has(threadId) && threadRoot) {
      this.addThread(
        new ThreadTimeline(
          this.roomId,
          threadId,
          this.publishKey,
          this.request,
          this.relations,
          threadRoot
        )
      );
    }

    this.activeThread.publish(this.publishKey, threadId);
  }

  public closeThread(): void {
    this.activeThread.publish(this.publishKey, undefined);
  }

  public dispose(): void {
    this.disposer.run();
  }
}
