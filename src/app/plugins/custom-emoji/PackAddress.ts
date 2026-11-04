// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

export class PackAddress {
  public readonly roomId: string;

  public readonly stateKey: string;

  constructor(roomId: string, stateKey: string) {
    this.roomId = roomId;
    this.stateKey = stateKey;
  }
}
