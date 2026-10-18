import {
  ClientWidgetApi,
  IWidget,
  Widget,
  WidgetApiToWidgetAction,
  WidgetDriver,
} from 'matrix-widget-api';
import { ObjectReader } from 'neurone/lib/utils';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import {
  ProcessedToDeviceEvent,
  ToDeviceDecrypted,
  ToDeviceUTD,
} from 'neurone/lib/crypto/machine/events';
import { ClientEventWithoutRoomId, ToDeviceEvent } from 'neurone/lib/api/types';
import { CallWidgetDriver } from './CallWidgetDriver';
import { trimTrailingSlash } from '../../utils/common';
import {
  ElementCallIntent,
  ElementCallThemeKind,
  ElementMediaStateDetail,
  ElementWidgetActions,
} from './types';
import { CallControl } from './CallControl';
import { CallControlState } from './CallControlState';
import { ClientContext } from '../../../client/context';
import { RoomType } from '../../../types/matrix/room';

export class CallEmbed implements Disposable {
  private ct: ClientContext;

  public readonly roomId: string;

  public readonly call: ClientWidgetApi;

  public readonly iframe: HTMLIFrameElement;

  public joined = false;

  public readonly control: CallControl;

  private readonly container: HTMLElement;

  private readonly disposer = new Disposer();

  static getIntent(dm: boolean, ongoing: boolean, video?: boolean): ElementCallIntent {
    if (dm && ongoing) {
      return video ? ElementCallIntent.JoinExistingDM : ElementCallIntent.JoinExistingDMVoice;
    }
    if (dm) {
      return video ? ElementCallIntent.StartCallDM : ElementCallIntent.StartCallDMVoice;
    }

    if (ongoing) {
      return video ? ElementCallIntent.JoinExisting : ElementCallIntent.JoinExistingVoice;
    }
    return video ? ElementCallIntent.StartCall : ElementCallIntent.StartCallVoice;
  }

  static dmCall(intent: ElementCallIntent): boolean {
    return (
      intent === ElementCallIntent.JoinExistingDM ||
      intent === ElementCallIntent.JoinExistingDMVoice ||
      intent === ElementCallIntent.StartCallDM ||
      intent === ElementCallIntent.StartCallDMVoice
    );
  }

  static startingCall(intent: ElementCallIntent): boolean {
    return (
      intent === ElementCallIntent.StartCallDM ||
      intent === ElementCallIntent.StartCallDMVoice ||
      intent === ElementCallIntent.StartCall ||
      intent === ElementCallIntent.StartCallVoice
    );
  }

  static getWidget(
    ct: ClientContext,
    roomId: string,
    intent: ElementCallIntent,
    themeKind: ElementCallThemeKind
  ): Widget {
    const { userId, deviceId, baseUrl } = ct.session;

    const clientOrigin = window.location.origin;
    const widgetId = 'call-embed';

    const params = new URLSearchParams({
      widgetId,
      parentUrl: clientOrigin,
      baseUrl,
      roomId,
      userId,
      deviceId,
      intent,

      skipLobby: 'true',
      confineToRoom: 'true',
      appPrompt: 'false',
      lang: 'en-EN',
      theme: themeKind,
      header: 'none',
    });

    const createEvent = ct.state.join.create.read.find((evt) => evt.roomId === roomId)?.event;
    const roomType = ObjectReader.string(createEvent?.content, 'type');
    if (roomType === RoomType.Call && CallEmbed.startingCall(intent)) {
      params.append('sendNotificationType', CallEmbed.dmCall(intent) ? 'ring' : 'notification');
    }

    const widgetUrl = new URL(
      `${trimTrailingSlash(import.meta.env.BASE_URL)}/public/element-call/index.html`,
      window.location.origin
    );
    widgetUrl.search = params.toString();

    const options: IWidget = {
      id: widgetId,
      creatorUserId: userId,
      name: 'Call',
      type: 'm.call',
      url: widgetUrl.href,
      waitForIframeLoad: false,
      data: {},
    };

    const widget: Widget = new Widget(options);

    return widget;
  }

  static getIframe(url: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');

    iframe.title = 'Call Embed';
    iframe.sandbox =
      'allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads';
    iframe.allow = 'microphone; camera; display-capture; autoplay; clipboard-write;';
    iframe.src = url;

    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    return iframe;
  }

  constructor(
    ct: ClientContext,
    roomId: string,
    widget: Widget,
    container: HTMLElement,
    initialControlState?: CallControlState
  ) {
    const iframe = CallEmbed.getIframe(widget.getCompleteUrl({ currentUserId: ct.session.userId }));
    container.append(iframe);

    const callWidgetDriver: WidgetDriver = new CallWidgetDriver(ct, roomId);
    const call: ClientWidgetApi = new ClientWidgetApi(widget, iframe, callWidgetDriver);

    this.ct = ct;
    this.call = call;
    this.roomId = roomId;
    this.iframe = iframe;
    this.container = container;

    const controlState = initialControlState ?? new CallControlState(true, false, true);
    this.control = new CallControl(controlState, call, iframe);
    this.control.startObserving();
    iframe.onload = () => {
      this.control.startObserving();
    };

    let initialMediaEvent = true;
    this.disposer.collect(
      this.listenAction<ElementMediaStateDetail>(ElementWidgetActions.DeviceMute, (evt) => {
        if (initialMediaEvent) {
          initialMediaEvent = false;
          this.control.applyState();
          return;
        }
        this.control.onMediaState(evt);
      })
    );

    this.start();
  }

  get document(): Document | undefined {
    return this.iframe.contentDocument ?? this.iframe.contentWindow?.document;
  }

  public setTheme(theme: ElementCallThemeKind) {
    return this.call.transport.send(WidgetApiToWidgetAction.ThemeChange, {
      name: theme,
    });
  }

  public hangup() {
    return this.call.transport.send(ElementWidgetActions.HangupCall, {});
  }

  public onPreparing(callback: () => void) {
    return this.listenEvent('preparing', callback);
  }

  public onPreparingError(callback: (error: any) => void) {
    return this.listenEvent('error:preparing', callback);
  }

  public onReady(callback: () => void) {
    return this.listenEvent('ready', callback);
  }

  public onCapabilitiesNotified(callback: () => void) {
    return this.listenEvent('capabilitiesNotified', callback);
  }

  private start() {
    // Room widgets get locked to the room they were added in
    this.call.setViewedRoomId(this.roomId);
    this.disposer.collect(
      this.listenAction(ElementWidgetActions.JoinCall, this.onCallJoined.bind(this))
    );

    this.disposer.collect(
      this.ct.toDeviceEvents.subscribe((toDeviceEvents) => {
        this.handleToDeviceEvents(toDeviceEvents);
      }),
      this.ct.sync.observable.subscribe((syncValue) => {
        const [, data] = syncValue ?? [];
        if (!data) return;

        const roomData = data.rooms?.join?.[this.roomId];
        const events = roomData?.timeline?.events;

        if (!events) return;
        this.handleTimelineEvents(events);
      })
    );
  }

  private handleToDeviceEvents(toDeviceEvents: ProcessedToDeviceEvent[]): void {
    toDeviceEvents.forEach((toDevice) => {
      const encrypted = toDevice instanceof ToDeviceDecrypted || toDevice instanceof ToDeviceUTD;
      this.call.feedToDevice(toDevice.event as ToDeviceEvent<Record<string, unknown>>, encrypted);
    });
  }

  private handleTimelineEvents(events: ClientEventWithoutRoomId[]): void {
    events.forEach(async (event) => {
      if (this.ct.encryptedRooms.read.has(this.roomId)) {
        const decryptedEvent = await this.ct.decryption.tryDecryptEvent(this.roomId, event);
        this.feedEvent(decryptedEvent);
        return;
      }
      this.feedEvent(event);
    });
  }

  private feedEvent(event: ClientEventWithoutRoomId): void {
    if ('state_key' in event) {
      this.call.feedStateUpdate({
        ...event,
        room_id: this.roomId,
        content: event.content as Record<string, unknown>,
        unsigned: event.unsigned as Record<string, unknown>,
      });
      return;
    }

    this.call.feedEvent({
      ...event,
      room_id: this.roomId,
      content: event.content as Record<string, unknown>,
      unsigned: event.unsigned as Record<string, unknown>,
    });
  }

  private onCallJoined(): void {
    this.joined = true;
  }

  public listenAction<T>(type: string, callback: (event: CustomEvent<T>) => void) {
    return this.listenEvent(`action:${type}`, callback);
  }

  public listenEvent<T>(type: string, callback: (event: T) => void) {
    this.call.on(type, callback);
    return () => {
      this.call.off(type, callback);
    };
  }

  /**
   * Stops the widget messaging for if it is started. Skips stopping if it is an active
   * widget.
   * @param opts
   */
  public dispose(): void {
    this.disposer.run();
    this.call.stop();
    this.container.removeChild(this.iframe);
    this.control.dispose();
  }
}
