// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

export class BatchInfo {
  public readonly token?: string;

  public readonly end?: boolean;

  constructor(token?: string, end?: boolean) {
    this.token = token;
    this.end = end;
  }
}
