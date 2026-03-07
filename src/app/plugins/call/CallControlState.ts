export class CallControlState {
  public readonly microphone: boolean;

  public readonly video: boolean;

  public readonly sound: boolean;

  constructor(microphone: boolean, video: boolean, sound: boolean) {
    this.microphone = microphone;
    this.video = video;
    this.sound = sound;
  }
}
