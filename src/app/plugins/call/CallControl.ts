import { ClientWidgetApi } from 'matrix-widget-api';
import EventEmitter from 'events';
import { CallControlState } from './CallControlState';
import { ElementMediaStateDetail, ElementMediaStatePayload, ElementWidgetActions } from './types';

export enum CallControlEvent {
  StateUpdate = 'state_update',
}

export class CallControl extends EventEmitter implements CallControlState {
  private state: CallControlState;

  private call: ClientWidgetApi;

  private iframe: HTMLIFrameElement;

  constructor(state: CallControlState, call: ClientWidgetApi, iframe: HTMLIFrameElement) {
    super();

    this.state = state;
    this.call = call;
    this.iframe = iframe;
  }

  public getState(): CallControlState {
    return this.state;
  }

  public get microphone(): boolean {
    return this.state.microphone;
  }

  public get video(): boolean {
    return this.state.video;
  }

  public get sound(): boolean {
    return this.state.sound;
  }

  public async applyState() {
    await this.setMediaState({
      audio_enabled: this.microphone,
      video_enabled: this.video,
    });
    this.setSound(this.sound);
    this.emitStateUpdate();
  }

  public applySound() {
    this.setSound(this.sound);
  }

  private setMediaState(state: ElementMediaStatePayload) {
    return this.call.transport.send(ElementWidgetActions.DeviceMute, state);
  }

  private setSound(sound: boolean): void {
    const callDocument = this.iframe.contentDocument ?? this.iframe.contentWindow?.document;
    if (callDocument) {
      callDocument.querySelectorAll('audio').forEach((el) => {
        // eslint-disable-next-line no-param-reassign
        el.muted = !sound;
      });
    }
  }

  public onMediaState(evt: CustomEvent<ElementMediaStateDetail>) {
    const { data } = evt.detail;
    if (!data) return;

    const state = new CallControlState(
      data.audio_enabled ?? this.microphone,
      data.video_enabled ?? this.video,
      this.sound
    );

    this.state = state;
    this.emitStateUpdate();

    if (this.microphone && !this.sound) {
      this.toggleSound();
    }
  }

  public toggleMicrophone() {
    const payload: ElementMediaStatePayload = {
      audio_enabled: !this.microphone,
      video_enabled: this.video,
    };
    return this.setMediaState(payload);
  }

  public toggleVideo() {
    const payload: ElementMediaStatePayload = {
      audio_enabled: this.microphone,
      video_enabled: !this.video,
    };
    return this.setMediaState(payload);
  }

  public toggleSound() {
    const sound = !this.sound;

    this.setSound(sound);

    const state = new CallControlState(this.microphone, this.video, sound);
    this.state = state;
    this.emitStateUpdate();

    if (!this.sound && this.microphone) {
      this.toggleMicrophone();
    }
  }

  private emitStateUpdate() {
    this.emit(CallControlEvent.StateUpdate);
  }
}
