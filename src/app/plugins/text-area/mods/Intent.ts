// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { Cursor } from '../Cursor';
import { Operations } from '../Operations';
import { TextArea } from '../TextArea';

export class Intent {
  public readonly textArea: TextArea;

  public readonly operations: Operations;

  public readonly size: number;

  public readonly str: string;

  private intentReg: RegExp;

  constructor(size: number, textArea: TextArea, operations: Operations) {
    this.textArea = textArea;
    this.operations = operations;
    this.size = size;
    this.intentReg = /^\s*/;

    this.str = '';
    for (let i = 0; i < size; i += 1) this.str += ' ';
  }

  private lineIntent(cursor: Cursor): string {
    const lines = this.textArea.cursorLines(cursor);
    const selection = this.textArea.selection(lines);
    const match = selection.match(this.intentReg);
    if (!match) return '';
    return match[0];
  }

  public moveForward(cursor: Cursor): Cursor {
    const linesCursor = this.textArea.cursorLines(cursor);

    const selection = this.textArea.selection(linesCursor);
    const lines = selection.split('\n');

    const intentLines = lines.map((line) => `${this.str}${line}`);
    this.operations.insert(linesCursor, intentLines.join('\n'));

    const addedIntentLength = lines.length * this.str.length;
    return new Cursor(
      cursor.start === linesCursor.start ? cursor.start : cursor.start + this.str.length,
      cursor.end + addedIntentLength,
      cursor.direction
    );
  }

  public moveBackward(cursor: Cursor): Cursor {
    const linesCursor = this.textArea.cursorLines(cursor);

    const selection = this.textArea.selection(linesCursor);
    const lines = selection.split('\n');

    const intentLines = lines.map((line) => {
      if (line.startsWith(this.str)) return line.substring(this.str.length);
      return line.replace(this.intentReg, '');
    });
    const intentCursor = this.operations.insert(linesCursor, intentLines.join('\n'));

    const firstLineTrimLength = lines[0].length - intentLines[0].length;
    const lastLine = this.textArea.cursorLines(
      new Cursor(intentCursor.end, intentCursor.end, 'none')
    );

    const start = Math.max(cursor.start - firstLineTrimLength, linesCursor.start);
    const trimmedContentLength = linesCursor.length - intentCursor.length;
    const end = Math.max(lastLine.start, cursor.end - trimmedContentLength);
    return new Cursor(start, end, cursor.direction);
  }

  public addNewLine(cursor: Cursor): Cursor {
    const lineIntent = this.lineIntent(cursor);
    const line = `\n${lineIntent}`;

    const insertCursor = this.operations.insert(cursor, line);
    return new Cursor(insertCursor.end, insertCursor.end, 'none');
  }

  public addNextLine(cursor: Cursor): Cursor {
    const lineIntent = this.lineIntent(cursor);
    const line = `\n${lineIntent}`;

    const currentLine = this.textArea.cursorLines(cursor);
    const lineCursor = new Cursor(currentLine.end, currentLine.end, 'none');
    const insertCursor = this.operations.insert(lineCursor, line);
    return new Cursor(insertCursor.end, insertCursor.end, 'none');
  }

  public addPreviousLine(cursor: Cursor): Cursor {
    const lineIntent = this.lineIntent(cursor);
    const line = `\n${lineIntent}`;

    const prevLine = this.textArea.prevLine(cursor);
    const insertIndex = prevLine?.end ?? 0;
    const lineCursor = new Cursor(insertIndex, insertIndex, 'none');
    const insertCursor = this.operations.insert(lineCursor, line);
    return new Cursor(insertCursor.end, insertCursor.end, 'none');
  }
}
