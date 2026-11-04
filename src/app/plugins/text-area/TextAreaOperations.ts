/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { Cursor } from './Cursor';
import { Operations } from './Operations';
import { GetTarget } from './type';

export class TextAreaOperations implements Operations {
  private readonly getTarget: GetTarget;

  constructor(getTarget: GetTarget) {
    this.getTarget = getTarget;
  }

  get target() {
    return this.getTarget();
  }

  public select(cursor: Cursor) {
    this.target.setSelectionRange(cursor.start, cursor.end, cursor.direction);
  }

  public deselect(cursor: Cursor) {
    if (cursor.direction === 'backward') {
      this.target.setSelectionRange(cursor.start, cursor.start, 'none');
      return;
    }
    this.target.setSelectionRange(cursor.end, cursor.end, 'none');
  }

  public insert(cursor: Cursor, text: string): Cursor {
    const { value } = this.target;
    this.target.value = `${value.substring(0, cursor.start)}${text}${value.substring(cursor.end)}`;

    return new Cursor(cursor.start, cursor.start + text.length, cursor.direction);
  }
}
