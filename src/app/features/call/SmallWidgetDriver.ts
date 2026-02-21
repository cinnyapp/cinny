/* eslint-disable no-return-await */
/* eslint-disable no-param-reassign */
/* eslint-disable no-continue */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-dupe-class-members */
/*
 * Copyright 2024 New Vector Ltd.
 * Copyright 2020-2023 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */
import {
  type Capability,
  EventDirection,
  type ISendDelayedEventDetails,
  type ISendEventDetails,
  type IReadEventRelationsResult,
  type IRoomEvent,
  MatrixCapabilities,
  type Widget,
  WidgetDriver,
  WidgetEventCapability,
  WidgetKind,
  type IWidgetApiErrorResponseDataDetails,
  type ISearchUserDirectoryResult,
  type IGetMediaConfigResult,
  type UpdateDelayedEventAction,
  OpenIDRequestState,
  SimpleObservable,
  IOpenIDUpdate,
} from 'matrix-widget-api';
import {
  EventType,
  type IContent,
  MatrixError,
  type MatrixEvent,
  Direction,
  type SendDelayedEventResponse,
  type StateEvents,
  type TimelineEvents,
  MatrixClient,
} from 'matrix-js-sdk';

export class SmallWidgetDriver extends WidgetDriver {
  private allowedCapabilities: Set<Capability>;

  private readonly mxClient: MatrixClient; // Store the client instance

  public constructor(
    mx: MatrixClient,
    allowedCapabilities: Capability[],
    private forWidget: Widget,
    private forWidgetKind: WidgetKind,
    virtual: boolean, // Assuming 'virtual' might be needed later, kept for consistency
    private inRoomId?: string
  ) {
    super();
    this.mxClient = mx; // Store the passed instance

    this.allowedCapabilities = new Set([
      ...allowedCapabilities,
      MatrixCapabilities.Screenshots,
      // Add other base capabilities as needed, e.g., ElementWidgetCapabilities.RequiresClient
    ]);

    // --- Capabilities specific to Element Call (or similar trusted widgets) ---
    // This is a trusted Element Call widget that we control (adjust if not Element Call)
    this.allowedCapabilities.add(MatrixCapabilities.AlwaysOnScreen);
    this.allowedCapabilities.add(MatrixCapabilities.MSC3846TurnServers);
    this.allowedCapabilities.add(MatrixCapabilities.MSC4157SendDelayedEvent);
    this.allowedCapabilities.add(MatrixCapabilities.MSC4157UpdateDelayedEvent);
    // Capability to access the room timeline (MSC2762)
    this.allowedCapabilities.add(`org.matrix.msc2762.timeline:${inRoomId}`);
    // Capability to read room state (MSC2762)
    this.allowedCapabilities.add(`org.matrix.msc2762.state:${inRoomId}`);
    this.allowedCapabilities.add(
      WidgetEventCapability.forStateEvent(EventDirection.Receive, EventType.RoomMember).raw
    );
    this.allowedCapabilities.add(
      WidgetEventCapability.forStateEvent(EventDirection.Receive, 'org.matrix.msc3401.call').raw
    );
    this.allowedCapabilities.add(
      WidgetEventCapability.forStateEvent(EventDirection.Receive, EventType.RoomEncryption).raw
    );
    const clientUserId = this.mxClient.getSafeUserId();
    // For the legacy membership type
    this.allowedCapabilities.add(
      WidgetEventCapability.forStateEvent(
        EventDirection.Send,
        'org.matrix.msc3401.call.member',
        clientUserId
      ).raw
    );
    const clientDeviceId = this.mxClient.getDeviceId();
    if (clientDeviceId !== null) {
      // For the session membership type compliant with MSC4143
      this.allowedCapabilities.add(
        WidgetEventCapability.forStateEvent(
          EventDirection.Send,
          'org.matrix.msc3401.call.member',
          `_${clientUserId}_${clientDeviceId}`
        ).raw
      );
      // Version with no leading underscore, for room versions whose auth rules allow it
      this.allowedCapabilities.add(
        WidgetEventCapability.forStateEvent(
          EventDirection.Send,
          'org.matrix.msc3401.call.member',
          `${clientUserId}_${clientDeviceId}`
        ).raw
      );
    }
    this.allowedCapabilities.add(
      WidgetEventCapability.forStateEvent(EventDirection.Receive, 'org.matrix.msc3401.call.member')
        .raw
    );
    // for determining auth rules specific to the room version
    this.allowedCapabilities.add(
      WidgetEventCapability.forStateEvent(EventDirection.Receive, EventType.RoomCreate).raw
    );

    const sendRecvRoomEvents = [
      'io.element.call.encryption_keys',
      'org.matrix.rageshake_request',
      EventType.Reaction,
      EventType.RoomRedaction,
      'io.element.call.reaction',
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const eventType of sendRecvRoomEvents) {
      this.allowedCapabilities.add(
        WidgetEventCapability.forRoomEvent(EventDirection.Send, eventType).raw
      );
      this.allowedCapabilities.add(
        WidgetEventCapability.forRoomEvent(EventDirection.Receive, eventType).raw
      );
    }

    const sendRecvToDevice = [
      EventType.CallInvite,
      EventType.CallCandidates,
      EventType.CallAnswer,
      EventType.CallHangup,
      EventType.CallReject,
      EventType.CallSelectAnswer,
      EventType.CallNegotiate,
      EventType.CallSDPStreamMetadataChanged,
      EventType.CallSDPStreamMetadataChangedPrefix,
      EventType.CallReplaces,
      EventType.CallEncryptionKeysPrefix,
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const eventType of sendRecvToDevice) {
      this.allowedCapabilities.add(
        WidgetEventCapability.forToDeviceEvent(EventDirection.Send, eventType).raw
      );
      this.allowedCapabilities.add(
        WidgetEventCapability.forToDeviceEvent(EventDirection.Receive, eventType).raw
      );
    }
  }

  public async validateCapabilities(requested: Set<Capability>): Promise<Set<Capability>> {
    // Stubbed under the assumption voice calls will be valid thru element-call
    return requested;
  }

  public async sendEvent<K extends keyof StateEvents>(
    eventType: K,
    content: StateEvents[K],
    stateKey: string | null,
    targetRoomId: string | null
  ): Promise<ISendEventDetails>;

  public async sendEvent<K extends keyof TimelineEvents>(
    eventType: K,
    content: TimelineEvents[K],
    stateKey: null,
    targetRoomId: string | null
  ): Promise<ISendEventDetails>;

  public async sendEvent(
    eventType: string,
    content: IContent,
    stateKey: string | null = null,
    targetRoomId: string | null = null
  ): Promise<ISendEventDetails> {
    const client = this.mxClient;
    const roomId = targetRoomId || this.inRoomId;

    if (!client || !roomId) throw new Error('Not in a room or not attached to a client');

    let r: { event_id: string } | null;
    if (stateKey !== null) {
      // state event
      r = await client.sendStateEvent(
        roomId,
        eventType as keyof StateEvents,
        content as StateEvents[keyof StateEvents],
        stateKey
      );
    } else if (eventType === EventType.RoomRedaction) {
      // special case: extract the `redacts` property and call redact
      r = await client.redactEvent(roomId, content.redacts);
    } else {
      // message event
      r = await client.sendEvent(
        roomId,
        eventType as keyof TimelineEvents,
        content as TimelineEvents[keyof TimelineEvents]
      );
    }

    return { roomId, eventId: r.event_id };
  }

  /**
   * @experimental Part of MSC4140 & MSC4157
   * @see {@link WidgetDriver#sendDelayedEvent}
   */
  public async sendDelayedEvent<K extends keyof StateEvents>(
    delay: number | null,
    parentDelayId: string | null,
    eventType: K,
    content: StateEvents[K],
    stateKey: string | null,
    targetRoomId: string | null
  ): Promise<ISendDelayedEventDetails>;

  /**
   * @experimental Part of MSC4140 & MSC4157
   */
  public async sendDelayedEvent<K extends keyof TimelineEvents>(
    delay: number | null,
    parentDelayId: string | null,
    eventType: K,
    content: TimelineEvents[K],
    stateKey: null,
    targetRoomId: string | null
  ): Promise<ISendDelayedEventDetails>;

  public async sendDelayedEvent(
    delay: number | null,
    parentDelayId: string | null,
    eventType: string,
    content: IContent,
    stateKey: string | null = null,
    targetRoomId: string | null = null
  ): Promise<ISendDelayedEventDetails> {
    const client = this.mxClient;
    const roomId = targetRoomId || this.inRoomId;

    if (!client || !roomId) throw new Error('Not in a room or not attached to a client');

    let delayOpts;
    if (delay !== null) {
      delayOpts = {
        delay,
        ...(parentDelayId !== null && { parent_delay_id: parentDelayId }),
      };
    } else if (parentDelayId !== null) {
      delayOpts = {
        parent_delay_id: parentDelayId,
      };
    } else {
      throw new Error('Must provide at least one of delay or parentDelayId');
    }

    let r: SendDelayedEventResponse | null;
    if (stateKey !== null) {
      // state event
      r = await client._unstable_sendDelayedStateEvent(
        roomId,
        delayOpts,
        eventType as keyof StateEvents,
        content as StateEvents[keyof StateEvents],
        stateKey
      );
    } else {
      // message event
      r = await client._unstable_sendDelayedEvent(
        roomId,
        delayOpts,
        null,
        eventType as keyof TimelineEvents,
        content as TimelineEvents[keyof TimelineEvents]
      );
    }

    return {
      roomId,
      delayId: r.delay_id,
    };
  }

  /**
   * @experimental Part of MSC4140 & MSC4157
   */
  public async updateDelayedEvent(
    delayId: string,
    action: UpdateDelayedEventAction
  ): Promise<void> {
    const client = this.mxClient;

    if (!client) throw new Error('Not in a room or not attached to a client');

    await client._unstable_updateDelayedEvent(delayId, action);
  }

  /**
   * Implements {@link WidgetDriver#sendToDevice}
   */
  public async sendToDevice(
    eventType: string,
    encrypted: boolean,
    contentMap: { [userId: string]: { [deviceId: string]: object } }
  ): Promise<void> {
    const client = this.mxClient;

    if (encrypted) {
      const crypto = client.getCrypto();
      if (!crypto) throw new Error('E2EE not enabled');

      // attempt to re-batch these up into a single request
      const invertedContentMap: { [content: string]: { userId: string; deviceId: string }[] } = {};

      // eslint-disable-next-line no-restricted-syntax
      for (const userId of Object.keys(contentMap)) {
        const userContentMap = contentMap[userId];
        // eslint-disable-next-line no-restricted-syntax
        for (const deviceId of Object.keys(userContentMap)) {
          const content = userContentMap[deviceId];
          const stringifiedContent = JSON.stringify(content);
          invertedContentMap[stringifiedContent] = invertedContentMap[stringifiedContent] || [];
          invertedContentMap[stringifiedContent].push({ userId, deviceId });
        }
      }

      await Promise.all(
        Object.entries(invertedContentMap).map(async ([stringifiedContent, recipients]) => {
          const batch = await crypto.encryptToDeviceMessages(
            eventType,
            recipients,
            JSON.parse(stringifiedContent)
          );

          await client.queueToDevice(batch);
        })
      );
    } else {
      await client.queueToDevice({
        eventType,
        batch: Object.entries(contentMap).flatMap(([userId, userContentMap]) =>
          Object.entries(userContentMap).map(([deviceId, content]) => ({
            userId,
            deviceId,
            payload: content,
          }))
        ),
      });
    }
  }

  /**
   * Reads all events of the given type, and optionally `msgtype` (if applicable/defined),
   * the user has access to. The widget API will have already verified that the widget is
   * capable of receiving the events. Less events than the limit are allowed to be returned,
   * but not more.
   * @param roomId The ID of the room to look within.
   * @param eventType The event type to be read.
   * @param msgtype The msgtype of the events to be read, if applicable/defined.
   * @param stateKey The state key of the events to be read, if applicable/defined.
   * @param limit The maximum number of events to retrieve. Will be zero to denote "as many as
   * possible".
   * @param since When null, retrieves the number of events specified by the "limit" parameter.
   * Otherwise, the event ID at which only subsequent events will be returned, as many as specified
   * in "limit".
   * @returns {Promise<IRoomEvent[]>} Resolves to the room events, or an empty array.
   */
  public async readRoomTimeline(
    roomId: string,
    eventType: string,
    msgtype: string | undefined,
    stateKey: string | undefined,
    limit: number,
    since: string | undefined
  ): Promise<IRoomEvent[]> {
    limit = limit > 0 ? Math.min(limit, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER; // relatively arbitrary

    const room = this.mxClient.getRoom(roomId);
    if (room === null) return [];
    const results: MatrixEvent[] = [];
    const events = room.getLiveTimeline().getEvents(); // timelines are most recent last
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (results.length >= limit) break;
      if (since !== undefined && ev.getId() === since) break;

      if (ev.getType() !== eventType || ev.isState()) continue;
      if (eventType === EventType.RoomMessage && msgtype && msgtype !== ev.getContent().msgtype)
        continue;
      if (ev.getStateKey() !== undefined && stateKey !== undefined && ev.getStateKey() !== stateKey)
        continue;
      results.push(ev);
    }

    return results.map((e) => e.getEffectiveEvent() as IRoomEvent);
  }

  public async askOpenID(observer: SimpleObservable<IOpenIDUpdate>): Promise<void> {
    return observer.update({
      state: OpenIDRequestState.Allowed,
      token: await this.mxClient.getOpenIdToken(),
    });
  }

  /**
   * Reads the current values of all matching room state entries.
   * @param roomId The ID of the room.
   * @param eventType The event type of the entries to be read.
   * @param stateKey The state key of the entry to be read. If undefined,
   * all room state entries with a matching event type should be returned.
   * @returns {Promise<IRoomEvent[]>} Resolves to the events representing the
   * current values of the room state entries.
   */
  public async readRoomState(
    roomId: string,
    eventType: string,
    stateKey: string | undefined
  ): Promise<IRoomEvent[]> {
    const room = this.mxClient.getRoom(roomId);
    if (room === null) return [];
    const state = room.getLiveTimeline().getState(Direction.Forward);
    if (state === undefined) return [];

    if (stateKey === undefined)
      return state.getStateEvents(eventType).map((e) => e.getEffectiveEvent() as IRoomEvent);
    const event = state.getStateEvents(eventType, stateKey);
    return event === null ? [] : [event.getEffectiveEvent() as IRoomEvent];
  }

  /*
    public async navigate(uri: string): Promise<void> {
        navigateToPermalink(uri);
    }
    */

  public async readEventRelations(
    eventId: string,
    roomId?: string,
    relationType?: string,
    eventType?: string,
    from?: string,
    to?: string,
    limit?: number,
    direction?: 'f' | 'b'
  ): Promise<IReadEventRelationsResult> {
    const client = this.mxClient;
    const dir = direction as Direction;
    roomId = roomId ?? this.inRoomId ?? undefined;

    if (typeof roomId !== 'string') {
      throw new Error('Error while reading the current room');
    }

    const { events, nextBatch, prevBatch } = await client.relations(
      roomId,
      eventId,
      relationType ?? null,
      eventType ?? null,
      { from, to, limit, dir }
    );

    return {
      chunk: events.map((e) => e.getEffectiveEvent() as IRoomEvent),
      nextBatch: nextBatch ?? undefined,
      prevBatch: prevBatch ?? undefined,
    };
  }

  public async searchUserDirectory(
    searchTerm: string,
    limit?: number
  ): Promise<ISearchUserDirectoryResult> {
    const client = this.mxClient;

    const { limited, results } = await client.searchUserDirectory({ term: searchTerm, limit });

    return {
      limited,
      results: results.map((r) => ({
        userId: r.user_id,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
      })),
    };
  }

  public async getMediaConfig(): Promise<IGetMediaConfigResult> {
    const client = this.mxClient;

    return await client.getMediaConfig();
  }

  public async uploadFile(file: XMLHttpRequestBodyInit): Promise<{ contentUri: string }> {
    const client = this.mxClient;

    const uploadResult = await client.uploadContent(file);

    return { contentUri: uploadResult.content_uri };
  }

  /**
   * Download a file from the media repository on the homeserver.
   *
   * @param contentUri - the MXC URI of the file to download
   * @returns an object with: file - response contents as Blob
   */
  /*
    public async downloadFile(contentUri: string): Promise<{ file: XMLHttpRequestBodyInit }> {
        const client = this.mxClient;
        const media = mediaFromMxc(contentUri, client);
        const response = await media.downloadSource();
        const blob = await response.blob();
        return { file: blob };
    }
    */

  /**
   * Gets the IDs of all joined or invited rooms currently known to the
   * client.
   * @returns The room IDs.
   */
  public getKnownRooms(): string[] {
    return this.mxClient.getVisibleRooms().map((r) => r.roomId);
  }

  /**
   * Expresses a {@link MatrixError} as a JSON payload
   * for use by Widget API error responses.
   * @param error The error to handle.
   * @returns The error expressed as a JSON payload,
   * or undefined if it is not a {@link MatrixError}.
   */
  public processError(error: unknown): IWidgetApiErrorResponseDataDetails | undefined {
    return error instanceof MatrixError
      ? { matrix_api_error: error.asWidgetApiErrorData() }
      : undefined;
  }
}
