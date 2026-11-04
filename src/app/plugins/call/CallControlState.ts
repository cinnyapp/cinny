// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

export class CallControlState {
  public readonly microphone: boolean;

  public readonly video: boolean;

  public readonly sound: boolean;

  public readonly screenshare: boolean;

  public readonly spotlight: boolean;

  constructor(
    microphone: boolean,
    video: boolean,
    sound: boolean,
    screenshare = false,
    spotlight = false
  ) {
    this.microphone = microphone;
    this.video = video;
    this.sound = sound;
    this.screenshare = screenshare;
    this.spotlight = spotlight;
  }
}
