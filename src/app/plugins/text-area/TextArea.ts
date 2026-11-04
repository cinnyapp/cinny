// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { Cursor } from './Cursor';
import { GetTarget } from './type';

export class TextArea {
  private readonly getTarget: GetTarget;

  constructor(getTarget: GetTarget) {
    this.getTarget = getTarget;
  }

  get target() {
    return this.getTarget();
  }

  public selection(cursor: Cursor): string {
    return this.target.value.substring(cursor.start, cursor.end);
  }

  public lineBeginIndex(cursor: Cursor): number {
    const beforeValue = this.target.value.substring(0, cursor.start);
    const lineEndIndex = beforeValue.lastIndexOf('\n');
    return lineEndIndex + 1;
  }

  public lineEndIndex(cursor: Cursor): number {
    const afterValue = this.target.value.substring(cursor.end);
    const lineEndIndex = afterValue.indexOf('\n');
    return cursor.end + (lineEndIndex === -1 ? afterValue.length : lineEndIndex);
  }

  public cursorLines(cursor: Cursor): Cursor {
    const lineBeginIndex = this.lineBeginIndex(cursor);
    const lineEndIndex = this.lineEndIndex(cursor);

    const linesCursor = new Cursor(lineBeginIndex, lineEndIndex, 'none');
    return linesCursor;
  }

  public prevLine(cursor: Cursor): Cursor | undefined {
    const currentLineIndex = this.lineBeginIndex(cursor);
    const prevIndex = currentLineIndex - 1;

    if (prevIndex < 0) return undefined;

    const lineCursor = this.cursorLines(new Cursor(prevIndex, prevIndex, 'none'));
    return lineCursor;
  }

  public nextLine(cursor: Cursor): Cursor | undefined {
    const currentLineIndex = this.lineEndIndex(cursor);
    const nextIndex = currentLineIndex + 1;

    if (nextIndex > this.target.value.length) return undefined;

    const lineCursor = this.cursorLines(new Cursor(nextIndex, nextIndex, 'none'));
    return lineCursor;
  }
}
