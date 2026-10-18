import {
  type Capability,
  type ISendDelayedEventDetails,
  type ISendEventDetails,
  type IReadEventRelationsResult,
  type IRoomEvent,
  WidgetDriver,
  type IWidgetApiErrorResponseDataDetails,
  type ISearchUserDirectoryResult,
  type IGetMediaConfigResult,
  OpenIDRequestState,
  SimpleObservable,
  IOpenIDUpdate,
  IRoomAccountData,
  IRtcTransportsResult,
  IRtcLivekitGetTokenFromWidgetRequestData,
  IRtcLivekitGetTokenFromWidgetResponseData,
  IRtcLivekitDelegateDelayedLeaveFromWidgetRequestData,
  IRtcLivekitDelegateDelayedLeaveFromWidgetResponseData,
} from 'matrix-widget-api';
import {
  getMessages,
  GetMessagesOK,
  putRedact,
  PutRedactOK,
  putSend,
  PutSendOK,
  putStateEvent,
  PutStateEventOK,
} from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { putSendToDevice } from 'neurone/lib/api/matrix/client/v3/sendToDevice';
import { postUpload, PostUploadOK } from 'neurone/lib/api/matrix/media/v3/upload';
import { getConfig, GetConfigOK } from 'neurone/lib/api/matrix/client/v1/media';
import { postSearch, PostSearchOK } from 'neurone/lib/api/matrix/client/v3/userDirectory';
import {
  postOpenidRequestToken,
  PostOpenidRequestTokenOK,
} from 'neurone/lib/api/matrix/client/v3/user';
import {
  getRelations,
  GetRelationsOK,
  getRelationsRelType,
  getRelationsRelTypeEventType,
} from 'neurone/lib/api/matrix/client/v1/rooms';
import { QueryRange } from 'neurone/lib/storage/collection';
import { MatrixEndpointStruct } from 'neurone/lib/api/MatrixEndpoint';
import { ClientEventWithoutRoomId } from 'neurone/lib/api/types';
import { getCallCapabilities } from './utils';
import { downloadMedia, getMxIdServer } from '../../utils/matrix';
import { ClientContext } from '../../../client/context';
import { MessageEvent } from '../../../types/matrix/room';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { getAuthUploadRequest } from '../../../client/request';
import { getJoinRoomMemberId, getJoinRoomStateId } from '../../../client/storage/collections';
import { MAX_UNICODE } from '../../../client/storage';
import { rContent } from '../../../client/reader';
import {
  unstablePostDelayedEvents,
  unstablePutDelayedEvent,
  UnstablePutDelayedEventOK,
} from '../msc4140-delayed-events';
import { fulfilledPromiseSettledResult } from '../../utils/common';
import { ensureEncryptionSession } from '../../hooks/useEnsureRoomEncryptionSession';
import { unstablePutSendSticky } from '../msc4354-sticky-events';
import { unstableGetTransports, UnstableGetTransportsOK } from '../msc4143-matrixrtc';
import {
  unstablePostLivekitDelegateDelayedLeave,
  unstablePostLivekitGetToken,
  UnstablePostLivekitGetTokenOK,
} from '../msc4195-matrixrtc-livekit';
import { autoDiscovery } from '../../cs-api';

export class CallWidgetDriver extends WidgetDriver {
  private allowedCapabilities: Set<Capability>;

  public constructor(private ct: ClientContext, private inRoomId: string) {
    super();

    const { deviceId, userId } = ct.session;

    this.allowedCapabilities = getCallCapabilities(inRoomId, userId, deviceId);
  }

  public async validateCapabilities(requested: Set<Capability>): Promise<Set<Capability>> {
    const allow = Array.from(requested).filter((cap) => this.allowedCapabilities.has(cap));
    return new Set(allow);
  }

  public async sendEvent(
    eventType: string,
    content: object,
    stateKey: string | null = null,
    targetRoomId: string | null = null
  ): Promise<ISendEventDetails> {
    const roomId = targetRoomId || this.inRoomId;

    if (typeof stateKey === 'string') {
      const resp = await this.ct.requestAuthJSON(
        putStateEvent({ pathParams: { roomId, eventType, stateKey }, body: content })
      );
      const [err, result] = await parseMatrixResp<PutStateEventOK>(resp);
      if (err) throw err;

      return { roomId, eventId: result.event_id };
    }

    if (
      eventType === MessageEvent.RoomRedaction &&
      'redacts' in content &&
      typeof content.redacts === 'string'
    ) {
      // special case: extract the `redacts` property and call redact
      const resp = await this.ct.requestAuthJSON(
        putRedact({ pathParams: { roomId, eventId: content.redacts, txnId: this.ct.getTxnId() } })
      );
      const [err, result] = await parseMatrixResp<PutRedactOK>(resp);
      if (err) throw err;

      return { roomId, eventId: result.event_id };
    }

    let encContent: object | undefined;
    if (this.ct.encryptedRooms.read.has(roomId)) {
      await ensureEncryptionSession(this.ct, roomId);

      const encStr = await this.ct.machine.roomEncryption.encryptMessageEvent(
        roomId,
        eventType,
        content
      );
      encContent = JSON.parse(encStr);
    }

    const resp = await this.ct.requestAuthJSON(
      putSend({
        pathParams: {
          roomId,
          eventType: encContent ? MessageEvent.RoomMessageEncrypted : eventType,
          txnId: this.ct.getTxnId(),
        },
        body: encContent ?? content,
      })
    );
    const [err, result] = await parseMatrixResp<PutSendOK>(resp);
    if (err) throw err;

    return { roomId, eventId: result.event_id };
  }

  public async sendStickyEvent(
    stickyDurationMs: number,
    eventType: string,
    content: object,
    targetRoomId?: string | null
  ): Promise<ISendEventDetails> {
    const roomId = targetRoomId || this.inRoomId;

    let encContent: object | undefined;
    if (this.ct.encryptedRooms.read.has(roomId)) {
      await ensureEncryptionSession(this.ct, roomId);

      const encStr = await this.ct.machine.roomEncryption.encryptMessageEvent(
        roomId,
        eventType,
        content
      );
      encContent = JSON.parse(encStr);
    }

    const resp = await this.ct.requestAuthJSON(
      unstablePutSendSticky({
        pathParams: {
          roomId,
          eventType: encContent ? MessageEvent.RoomMessageEncrypted : eventType,
          txnId: this.ct.getTxnId(),
        },
        searchParams: {
          'org.matrix.msc4354.sticky_duration_ms': stickyDurationMs,
        },
        body: encContent ?? content,
      })
    );
    const [err, result] = await parseMatrixResp<PutSendOK>(resp);
    if (err) throw err;

    return { roomId, eventId: result.event_id };
  }

  public async sendDelayedEvent(
    delay: number,
    eventType: string,
    content: object,
    stateKey: string | null = null,
    targetRoomId: string | null = null
  ): Promise<ISendDelayedEventDetails> {
    const roomId = targetRoomId || this.inRoomId;

    let encContent: object | undefined;
    if (typeof stateKey !== 'string' && this.ct.encryptedRooms.read.has(roomId)) {
      await ensureEncryptionSession(this.ct, roomId);

      const encStr = await this.ct.machine.roomEncryption.encryptMessageEvent(
        roomId,
        eventType,
        content
      );
      encContent = JSON.parse(encStr);
    }
    const resp = await this.ct.requestAuthJSON(
      unstablePutDelayedEvent({
        pathParams: {
          roomId,
          eventType: encContent ? MessageEvent.RoomMessageEncrypted : eventType,
          txnId: this.ct.getTxnId(),
        },
        body: {
          delay_ms: delay,
          state_key: stateKey ?? undefined,
          content: encContent ?? content,
        },
      })
    );

    const [err, result] = await parseMatrixResp<UnstablePutDelayedEventOK>(resp);

    if (err) {
      throw err;
    }

    return {
      roomId,
      delayId: result.delay_id,
    };
  }

  public async sendDelayedStickyEvent(
    delay: number,
    stickyDurationMs: number,
    eventType: string,
    content: object,
    targetRoomId?: string | null
  ): Promise<ISendDelayedEventDetails> {
    const roomId = targetRoomId || this.inRoomId;

    let encContent: object | undefined;
    if (this.ct.encryptedRooms.read.has(roomId)) {
      await ensureEncryptionSession(this.ct, roomId);

      const encStr = await this.ct.machine.roomEncryption.encryptMessageEvent(
        roomId,
        eventType,
        content
      );
      encContent = JSON.parse(encStr);
    }
    const resp = await this.ct.requestAuthJSON(
      unstablePutDelayedEvent({
        pathParams: {
          roomId,
          eventType: encContent ? MessageEvent.RoomMessageEncrypted : eventType,
          txnId: this.ct.getTxnId(),
        },
        body: {
          delay_ms: delay,
          'org.matrix.msc4354.sticky_duration_ms': stickyDurationMs,
          content: encContent ?? content,
        },
      })
    );

    const [err, result] = await parseMatrixResp<UnstablePutDelayedEventOK>(resp);

    if (err) {
      throw err;
    }

    return {
      roomId,
      delayId: result.delay_id,
    };
  }

  public async cancelScheduledDelayedEvent(delayId: string): Promise<void> {
    const resp = await this.ct.requestAuthJSON(
      unstablePostDelayedEvents({ pathParams: { delayId, action: 'cancel' } })
    );
    await parseMatrixResp(resp);
  }

  public async restartScheduledDelayedEvent(delayId: string): Promise<void> {
    const resp = await this.ct.requestAuthJSON(
      unstablePostDelayedEvents({ pathParams: { delayId, action: 'restart' } })
    );
    await parseMatrixResp(resp);
  }

  public async sendScheduledDelayedEvent(delayId: string): Promise<void> {
    const resp = await this.ct.requestAuthJSON(
      unstablePostDelayedEvents({ pathParams: { delayId, action: 'send' } })
    );
    await parseMatrixResp(resp);
  }

  public async sendToDevice(
    eventType: string,
    encrypted: boolean,
    contentMap: { [userId: string]: { [deviceId: string]: object } }
  ): Promise<void> {
    let messages = contentMap;

    if (encrypted) {
      const users = Object.keys(contentMap);
      await this.ct.machine.outgoingRequests.claimKeys(users);

      const encryptedContentMap: { [userId: string]: { [deviceId: string]: object } } = {};

      await Promise.allSettled(
        Object.entries(contentMap).map(async ([userId, userContentMap]) => {
          encryptedContentMap[userId] = {};

          await Promise.all(
            Object.entries(userContentMap).map(async ([deviceId, payload]) => {
              const userDevice = await this.ct.machine.userTracker.getDevice(userId, deviceId);

              if (!userDevice) {
                throw new Error(`Device not found: ${userId} / ${deviceId}`);
              }

              try {
                const encryptedPayload = userDevice.encryptToDeviceEvent(eventType, payload);

                if (encryptedPayload == null || typeof encryptedPayload !== 'object') {
                  throw new Error('Encryption returned an invalid payload');
                }

                encryptedContentMap[userId][deviceId] = encryptedPayload;
              } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);

                throw new Error(
                  `Failed to encrypt to-device event for ${userId} / ${deviceId}: ${reason}`,
                  { cause: error }
                );
              }
            })
          );
        })
      );

      messages = encryptedContentMap;
    }

    const resp = await this.ct.requestAuthJSON(
      putSendToDevice({
        pathParams: { eventType, txnId: this.ct.getTxnId() },
        body: { messages },
      })
    );

    const [err] = await parseMatrixResp(resp);

    if (err) {
      throw err;
    }
  }

  public async readRoomAccountData(
    eventType: string,
    roomIds?: string[] | null
  ): Promise<IRoomAccountData[]> {
    const dataObjects = await this.ct.storage.joinAccountData.read.queryIndex('type', eventType);
    const events = dataObjects
      .filter((obj) => (Array.isArray(roomIds) ? roomIds.includes(obj.roomId) : true))
      .map((obj) => ({
        ...obj.event,
        room_id: obj.roomId,
        content: obj.event.content as Record<string, unknown>,
      }));

    return events;
  }

  public async readStickyEvents(roomId: string): Promise<IRoomEvent[]> {
    const eventObjs = await this.ct.storage.joinRoomSticky.read.queryIndex('roomId', roomId);

    return eventObjs.map(({ event }) => ({
      room_id: roomId,
      ...event,
      content: event.content as Record<string, unknown>,
      unsigned: event.unsigned as Record<string, unknown>,
    }));
  }

  public async readRoomTimeline(
    roomId: string,
    eventType: string,
    msgtype: string | undefined,
    stateKey: string | undefined,
    limit: number
  ): Promise<IRoomEvent[]> {
    const safeLimit =
      limit > 0 ? Math.min(limit, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;

    const msgResp = await this.ct.requestAuthJSON(
      getMessages({
        pathParams: { roomId },
        searchParams: { dir: 'b', limit: safeLimit },
      })
    );

    const [err, result] = await parseMatrixResp<GetMessagesOK>(msgResp);
    if (err) throw err;

    let events: ClientEventWithoutRoomId[] = result.chunk;

    if (this.ct.encryptedRooms.read.has(roomId)) {
      const pending = events.map((evt) => this.ct.decryption.tryDecryptEvent(roomId, evt));

      events = fulfilledPromiseSettledResult(await Promise.allSettled(pending));
    }

    const resultEvents: ClientEventWithoutRoomId[] = [];

    for (let i = 0; i < events.length; i += 1) {
      const ev = events[i];
      if (resultEvents.length >= safeLimit) break;

      const eventStateKey = 'state_key' in ev ? ev.state_key : undefined;

      if (
        ev.type === eventType &&
        (eventStateKey === undefined || stateKey === undefined || eventStateKey === stateKey) &&
        (eventType !== MessageEvent.RoomMessage ||
          !msgtype ||
          msgtype === rContent.msgtype(ev.content))
      ) {
        resultEvents.push(ev);
      }
    }

    return resultEvents.map((evt) => ({
      room_id: roomId,
      ...evt,
      content: evt.content as Record<string, unknown>,
      unsigned: evt.unsigned as Record<string, unknown>,
    }));
  }

  public async readRoomState(
    roomId: string,
    eventType: string,
    stateKey: string | undefined
  ): Promise<IRoomEvent[]> {
    if (stateKey === undefined) {
      const stateObjs =
        eventType === 'm.room.member'
          ? await this.ct.storage.joinRoomMember.read.queryIndex('roomId', roomId)
          : await this.ct.storage.joinRoomState.read.query(
              new QueryRange(
                getJoinRoomStateId(roomId, eventType, ''),
                getJoinRoomStateId(roomId, eventType, MAX_UNICODE)
              )
            );

      return stateObjs.map((stateObj) => ({
        ...stateObj.event,
        room_id: roomId,
        content: stateObj.event.content as Record<string, unknown>,
        unsigned: stateObj.event.unsigned as Record<string, unknown>,
      }));
    }

    const stateObj =
      eventType === 'm.room.member'
        ? await this.ct.storage.joinRoomMember.read.get(getJoinRoomMemberId(roomId, stateKey))
        : await this.ct.storage.joinRoomState.read.get(
            getJoinRoomStateId(roomId, eventType, stateKey ?? '')
          );
    if (!stateObj) return [];
    const { event: stateEvent } = stateObj;

    return [
      {
        ...stateEvent,
        room_id: roomId,
        content: stateEvent.content as Record<string, unknown>,
        unsigned: stateEvent.unsigned as Record<string, unknown>,
      },
    ];
  }

  public async readEventRelations(
    eventId: string,
    roomId?: string,
    relType?: string,
    eventType?: string,
    from?: string,
    to?: string,
    limit?: number,
    dir?: 'f' | 'b'
  ): Promise<IReadEventRelationsResult> {
    const targetRoomId = roomId ?? this.inRoomId;

    if (typeof targetRoomId !== 'string') {
      throw new Error('Error while reading the current room');
    }

    let endpoint: MatrixEndpointStruct;
    if (relType && eventType) {
      endpoint = getRelationsRelTypeEventType({
        pathParams: { roomId: targetRoomId, eventId, relType, eventType },
        searchParams: { dir, from, to, limit },
      });
    } else if (relType) {
      endpoint = getRelationsRelType({
        pathParams: { roomId: targetRoomId, eventId, relType },
        searchParams: { dir, from, to, limit },
      });
    } else {
      endpoint = getRelations({
        pathParams: { roomId: targetRoomId, eventId },
        searchParams: { dir, from, to, limit },
      });
    }

    const resp = await this.ct.requestAuthJSON(endpoint);

    const [err, result] = await parseMatrixResp<GetRelationsOK>(resp);

    if (err) {
      throw err;
    }

    if (this.ct.encryptedRooms.read.has(targetRoomId)) {
      const pending = result.chunk.map((evt) =>
        this.ct.decryption.tryDecryptEvent(targetRoomId, evt)
      );
      const clientEvents = fulfilledPromiseSettledResult(await Promise.allSettled(pending));
      return {
        chunk: clientEvents.map((evt) => ({
          room_id: targetRoomId,
          ...evt,
          content: evt.content as Record<string, unknown>,
          unsigned: evt.unsigned as Record<string, unknown>,
        })),
        prevBatch: result.prev_batch,
        nextBatch: result.next_batch,
      };
    }
    return result as IReadEventRelationsResult;
  }

  public async askOpenID(observer: SimpleObservable<IOpenIDUpdate>): Promise<void> {
    const resp = await this.ct.requestAuthJSON(
      postOpenidRequestToken({
        pathParams: {
          userId: this.ct.session.userId,
        },
      })
    );
    const [err, result] = await parseMatrixResp<PostOpenidRequestTokenOK>(resp);
    if (err) return;

    observer.update({ state: OpenIDRequestState.Allowed, token: result });
  }

  public async searchUserDirectory(
    searchTerm: string,
    limit?: number
  ): Promise<ISearchUserDirectoryResult> {
    const resp = await this.ct.requestAuthJSON(
      postSearch({ body: { search_term: searchTerm, limit } })
    );
    const [err, result] = await parseMatrixResp<PostSearchOK>(resp);
    if (err) {
      throw err;
    }

    return {
      limited: result.limited,
      results: result.results.map((r) => ({
        userId: r.user_id,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
      })),
    };
  }

  public async getMediaConfig(): Promise<IGetMediaConfigResult> {
    const resp = await this.ct.requestAuthJSON(getConfig({}));
    const [err, result] = await parseMatrixResp<GetConfigOK>(resp);
    if (err) {
      throw err;
    }
    return result;
  }

  public async getRtcTransports(): Promise<IRtcTransportsResult> {
    const resp = await this.ct.requestAuthJSON(unstableGetTransports({}));
    const [err, result] = await parseMatrixResp<UnstableGetTransportsOK>(resp);
    if (result) {
      return {
        rtc_transports: result.rtc_transports ?? result.transports,
      };
    }

    const userId = getMxIdServer(this.ct.session.userId);
    if (!userId) throw err;

    const [, info] = await autoDiscovery(fetch, userId);
    const rtcInfo = info?.['org.matrix.msc4143.rtc_foci'];
    if (rtcInfo)
      return {
        rtc_transports: rtcInfo,
      };

    throw err;
  }

  public async uploadFile(file: XMLHttpRequestBodyInit): Promise<{ contentUri: string }> {
    if (!(file instanceof Blob) || !(file instanceof FormData)) {
      throw new Error('Failed to upload file. Unsupported file type');
    }

    const request = getAuthUploadRequest<PostUploadOK>(
      this.ct.session.baseUrl,
      this.ct.session.accessToken
    );
    const [err, result] = await request(postUpload({ body: file }));
    if (err) {
      throw err;
    }
    return { contentUri: result.content_uri };
  }

  public async downloadFile(contentUri: string): Promise<{ file: XMLHttpRequestBodyInit }> {
    const httpUrl = mxcToHttp(this.ct.session.baseUrl, contentUri, true).url();
    const blob = await downloadMedia(httpUrl);
    return { file: blob };
  }

  public async getRtcLivekitToken(
    data: IRtcLivekitGetTokenFromWidgetRequestData
  ): Promise<IRtcLivekitGetTokenFromWidgetResponseData> {
    const resp = await this.ct.requestAuthJSON(
      unstablePostLivekitGetToken({
        body: data,
      })
    );
    const [err, result] = await parseMatrixResp<UnstablePostLivekitGetTokenOK>(resp);
    if (err) {
      throw err;
    }
    return result;
  }

  public async delegateRtcLivekitDelayedLeave(
    data: IRtcLivekitDelegateDelayedLeaveFromWidgetRequestData
  ): Promise<IRtcLivekitDelegateDelayedLeaveFromWidgetResponseData> {
    const resp = await this.ct.requestAuthJSON(
      unstablePostLivekitDelegateDelayedLeave({
        body: data,
      })
    );
    const [err] = await parseMatrixResp(resp);
    if (err) {
      throw err;
    }

    return {};
  }

  public getKnownRooms(): string[] {
    return this.ct.rooms.join.read;
  }

  // eslint-disable-next-line class-methods-use-this
  public processError(): IWidgetApiErrorResponseDataDetails | undefined {
    return undefined;
  }
}
