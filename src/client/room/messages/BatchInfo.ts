/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

export class BatchInfo {
  public readonly token?: string;

  public readonly end?: boolean;

  constructor(token?: string, end?: boolean) {
    this.token = token;
    this.end = end;
  }
}
