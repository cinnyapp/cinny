/*
 * Copyright 2024 New Vector Ltd.
 * Copyright 2020-2023 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import EventEmitter from 'events';
import {
  ClientEvent,
  Direction,
  IEvent,
  KnownMembership,
  MatrixClient,
  MatrixEvent,
  MatrixEventEvent,
} from 'matrix-js-sdk';
import {
  ClientWidgetApi,
  IRoomEvent,
  IStickyActionRequest,
  IWidget,
  IWidgetData,
  MatrixCapabilities,
  WidgetApiFromWidgetAction,
  WidgetKind,
} from 'matrix-widget-api';
import { logger } from 'matrix-js-sdk/lib/logger';
import { CinnyWidget } from './CinnyWidget';
import { SmallWidgetDriver } from './SmallWidgetDriver';

/**
 * Generates the URL for the Element Call widget.
 * @param mx - The MatrixClient instance.
 * @param roomId - The ID of the room.
 * @returns The generated URL object.
 */
export const getWidgetUrl = (
  mx: MatrixClient,
  roomId: string,
  elementCallUrl: string,
  widgetId: string,
  setParams: any
): URL => {
  const baseUrl = window.location.origin;
  const url = elementCallUrl
    ? new URL(`${elementCallUrl}/room`)
    : new URL('/public/element-call/index.html#', baseUrl);

  const params = new URLSearchParams({
    embed: 'true',
    widgetId,
    appPrompt: 'false',
    preload: 'false',
    skipLobby: setParams.skipLobby ?? 'true',
    returnToLobby: setParams.returnToLobby ?? 'true',
    perParticipantE2EE: setParams.perParticipantE2EE ?? 'true',
    hideHeader: 'true',
    userId: mx.getUserId()!,
    deviceId: mx.getDeviceId()!,
    roomId,
    baseUrl: mx.baseUrl!,
    parentUrl: window.location.origin,
  });

  const replacedParams = params.toString().replace(/%24/g, '$');
  url.search = `?${replacedParams}`;

  logger.info('Generated Element Call Widget URL:', url.toString());
  return url;
};

export interface IApp extends IWidget {
  client: MatrixClient;
  roomId: string;
  eventId?: string;
  avatar_url?: string;
  'io.element.managed_hybrid'?: boolean;
}

export class SmallWidget extends EventEmitter {
  private client: MatrixClient;

  private messaging: ClientWidgetApi | null = null;

  private mockWidget: CinnyWidget;

  public roomId?: string;

  public url?: string;

  public iframe: HTMLElement | null;

  private type: string; // Type of the widget (e.g., 'm.call')

  private readUpToMap: { [roomId: string]: string } = {}; // room ID to event ID

  private readonly eventsToFeed = new WeakSet<MatrixEvent>();

  private stickyPromise?: () => Promise<void>;

  constructor(private iapp: IApp) {
    super();
    this.client = iapp.client;
    this.roomId = iapp.roomId;
    this.url = iapp.url;
    this.type = iapp.type;
    this.mockWidget = new CinnyWidget(iapp);
  }

  /**
   * Initializes the widget messaging API.
   * @param iframe - The HTMLIFrameElement to bind to.
   * @returns The initialized ClientWidgetApi instance.
   */
  startMessaging(iframe: HTMLIFrameElement): ClientWidgetApi {
    // Ensure the driver is correctly instantiated
    // The capabilities array might need adjustment based on required permissions
    const driver = new SmallWidgetDriver(
      this.client,
      [],
      this.mockWidget,
      WidgetKind.Room,
      true,
      this.roomId
    );
    this.iframe = iframe;
    this.messaging = new ClientWidgetApi(this.mockWidget, iframe, driver);

    // Emit events during the widget lifecycle
    this.messaging.on('preparing', () => this.emit('preparing'));
    this.messaging.on('error:preparing', (err: unknown) => this.emit('error:preparing', err));
    this.messaging.once('ready', () => this.emit('ready'));
    // this.messaging.on("capabilitiesNotified", () => this.emit("capabilitiesNotified")); // Uncomment if needed

    // Populate the map of "read up to" events for this widget with the current event in every room.
    // This is a bit inefficient, but should be okay. We do this for all rooms in case the widget
    // requests timeline capabilities in other rooms down the road. It's just easier to manage here.
    for (const room of this.client.getRooms()) {
      // Timelines are most recent last
      const events = room.getLiveTimeline()?.getEvents() || [];
      const roomEvent = events[events.length - 1];
      if (!roomEvent) continue; // force later code to think the room is fresh
      this.readUpToMap[room.roomId] = roomEvent.getId()!;
    }

    this.messaging.on('action:org.matrix.msc2876.read_events', (ev: CustomEvent) => {
      const room = this.client.getRoom(this.roomId);
      const events: Partial<IEvent>[] = [];
      const { type } = ev.detail.data;

      ev.preventDefault();
      if (room === null) {
        return this.messaging?.transport.reply(ev.detail, { events });
      }
      const state = room.getLiveTimeline().getState(Direction.Forward);
      if (state === undefined) {
        return this.messaging?.transport.reply(ev.detail, { events });
      }

      const stateEvents = state.events?.get(type);

      for (const [key, eventObject] of stateEvents?.entries() ?? []) {
        events.push(eventObject.event);
      }

      return this.messaging?.transport.reply(ev.detail, { events });
    });

    /*
    this.messaging?.on('action:content_loaded', () => {
      this.messaging?.transport?.send('io.element.join', {
        audioInput: 'true',
        videoInput: 'true',
      });
    });
    */

    this.client.on(ClientEvent.Event, this.onEvent);
    this.client.on(MatrixEventEvent.Decrypted, this.onEventDecrypted);
    //this.client.on(RoomStateEvent.Events, this.onStateUpdate);
    this.client.on(ClientEvent.ToDeviceEvent, this.onToDeviceEvent);
    //this.client.on(RoomStateEvent.Events, this.onReadEvent);
    // this.messaging.setViewedRoomId(this.roomId ?? null);
    this.messaging.on(
      `action:${WidgetApiFromWidgetAction.UpdateAlwaysOnScreen}`,
      async (ev: CustomEvent<IStickyActionRequest>) => {
        if (this.messaging?.hasCapability(MatrixCapabilities.AlwaysOnScreen)) {
          ev.preventDefault();
          if (ev.detail.data.value) {
            // If the widget wants to become sticky we wait for the stickyPromise to resolve
            if (this.stickyPromise) await this.stickyPromise();
            this.messaging.transport.reply(ev.detail, {});
          }
          // Stop being persistent can be done instantly
          //MAKE PERSISTENT HERE
          // Send the ack after the widget actually has become sticky.
        }
      }
    );

    logger.info(`Widget messaging started for widgetId: ${this.mockWidget.id}`);
    return this.messaging;
  }

  private onEvent = (ev: MatrixEvent): void => {
    this.client.decryptEventIfNeeded(ev);
    this.feedEvent(ev);
  };

  private onEventDecrypted = (ev: MatrixEvent): void => {
    this.feedEvent(ev);
  };

  private onReadEvent = (ev: MatrixEvent): void => {
    this.feedEvent(ev);
  };

  private onToDeviceEvent = async (ev: MatrixEvent): Promise<void> => {
    await this.client.decryptEventIfNeeded(ev);
    if (ev.isDecryptionFailure()) return;
    await this.messaging?.feedToDevice(ev.getEffectiveEvent() as IRoomEvent, ev.isEncrypted());
  };

  /**
   * Determines whether the event comes from a room that we've been invited to
   * (in which case we likely don't have the full timeline).
   */
  private isFromInvite(ev: MatrixEvent): boolean {
    const room = this.client.getRoom(ev.getRoomId());
    return room?.getMyMembership() === KnownMembership.Invite;
  }

  /**
   * Determines whether the event has a relation to an unknown parent.
   */
  private relatesToUnknown(ev: MatrixEvent): boolean {
    // Replies to unknown events don't count
    if (!ev.relationEventId || ev.replyEventId) return false;
    const room = this.client.getRoom(ev.getRoomId());
    return room === null || !room.findEventById(ev.relationEventId);
  }

  // eslint-disable-next-line class-methods-use-this
  private arrayFastClone<T>(a: T[]): T[] {
    return a.slice(0, a.length);
  }

  private advanceReadUpToMarker(ev: MatrixEvent): boolean {
    const evId = ev.getId();
    if (evId === undefined) return false;
    const roomId = ev.getRoomId();
    if (roomId === undefined) return false;
    const room = this.client.getRoom(roomId);
    if (room === null) return false;

    const upToEventId = this.readUpToMap[ev.getRoomId()!];
    if (!upToEventId) {
      // There's no marker yet; start it at this event
      this.readUpToMap[roomId] = evId;
      return true;
    }

    // Small optimization for exact match (skip the search)
    if (upToEventId === evId) return false;

    // Timelines are most recent last, so reverse the order and limit ourselves to 100 events
    // to avoid overusing the CPU.
    const timeline = room.getLiveTimeline();
    const events = this.arrayFastClone(timeline.getEvents()).reverse().slice(0, 100);

    for (const timelineEvent of events) {
      if (timelineEvent.getId() === upToEventId) {
        // The event must be somewhere before the "read up to" marker
        return false;
      }
      if (timelineEvent.getId() === ev.getId()) {
        // The event is after the marker; advance it
        this.readUpToMap[roomId] = evId;
        return true;
      }
    }

    // We can't say for sure whether the widget has seen the event; let's
    // just assume that it has
    return false;
  }

  private feedEvent(ev: MatrixEvent): void {
    if (this.messaging === null) return;

    if (
      // If we had decided earlier to feed this event to the widget, but
      // it just wasn't ready, give it another try
      this.eventsToFeed.delete(ev) ||
      // Skip marker timeline check for events with relations to unknown parent because these
      // events are not added to the timeline here and will be ignored otherwise:
      // https://github.com/matrix-org/matrix-js-sdk/blob/d3dfcd924201d71b434af3d77343b5229b6ed75e/src/models/room.ts#L2207-L2213
      this.relatesToUnknown(ev) ||
      // Skip marker timeline check for rooms where membership is
      // 'invite', otherwise the membership event from the invitation room
      // will advance the marker and new state events will not be
      // forwarded to the widget.
      this.isFromInvite(ev) ||
      // Check whether this event would be before or after our "read up to" marker. If it's
      // before, or we can't decide, then we assume the widget will have already seen the event.
      // If the event is after, or we don't have a marker for the room, then the marker will advance and we'll
      // send it through.
      // This approach of "read up to" prevents widgets receiving decryption spam from startup or
      // receiving ancient events from backfill and such.
      this.advanceReadUpToMarker(ev)
    ) {
      // If the event is still being decrypted, remember that we want to
      // feed it to the widget (even if not strictly in the order given by
      // the timeline) and get back to it later
      if (ev.isBeingDecrypted() || ev.isDecryptionFailure()) {
        this.eventsToFeed.add(ev);
      } else {
        const raw = ev.getEffectiveEvent();
        this.messaging.feedEvent(raw as IRoomEvent, this.roomId ?? '').catch((e) => {
          logger.error('Error sending event to widget: ', e);
        });
      }
    }
  }

  /**
   * Stops the widget messaging and cleans up resources.
   */
  stopMessaging() {
    if (this.messaging) {
      this.messaging.stop(); // Example if a stop method exists
      this.messaging.removeAllListeners(); // Remove listeners attached by SmallWidget
      logger.info(`Widget messaging stopped for widgetId: ${this.mockWidget.id}`);
      this.messaging = null;
    }
  }
}

/**
 * Creates the data object for the widget.
 * @param client - The MatrixClient instance.
 * @param roomId - The ID of the room.
 * @param currentData - Existing widget data.
 * @param overwriteData - Data to merge or overwrite.
 * @returns The final widget data object.
 */
export const getWidgetData = (
  client: MatrixClient,
  roomId: string,
  currentData: object,
  overwriteData: object
): IWidgetData => {
  // Example: Determine E2EE based on room state if needed
  const perParticipantE2EE = true; // Default or based on logic
  // const roomEncryption = client.getRoom(roomId)?.currentState.getStateEvents(EventType.RoomEncryption, "");
  // if (roomEncryption) perParticipantE2EE = true; // Simplified example

  return {
    ...currentData,
    ...overwriteData,
    perParticipantE2EE,
  };
};

/**
 * Creates a virtual widget definition (IApp).
 * @param client - MatrixClient instance.
 * @param id - Widget ID.
 * @param creatorUserId - User ID of the creator.
 * @param name - Widget display name.
 * @param type - Widget type (e.g., 'm.call').
 * @param url - Widget URL.
 * @param waitForIframeLoad - Whether to wait for iframe load signal.
 * @param data - Widget data.
 * @param roomId - Room ID.
 * @returns The IApp widget definition.
 */
export const createVirtualWidget = (
  client: MatrixClient,
  id: string,
  creatorUserId: string,
  name: string,
  type: string,
  url: URL,
  waitForIframeLoad: boolean,
  data: IWidgetData,
  roomId: string
): IApp => ({
  client,
  id,
  creatorUserId,
  name,
  type,
  url: url.toString(), // Store URL as string in the definition
  waitForIframeLoad,
  data,
  roomId,
  // Add other required fields from IWidget if necessary
  sender: creatorUserId, // Example: Assuming sender is the creator
  content: {
    // Example content structure
    type,
    url: url.toString(),
    name,
    data,
    creatorUserId,
  },
});
