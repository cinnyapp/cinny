/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

export class PackAddress {
  public readonly roomId: string;

  public readonly stateKey: string;

  constructor(roomId: string, stateKey: string) {
    this.roomId = roomId;
    this.stateKey = stateKey;
  }
}
