/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

type ChangeType = 'Grow' | 'Shrink';

type ChangeDirection = 'f' | 'b';

export class BatchChange {
  public readonly type?: ChangeType;

  public readonly dir?: ChangeDirection;

  constructor(type?: ChangeType, dir?: ChangeDirection) {
    this.type = type;
    this.dir = dir;
  }
}
