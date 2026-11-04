// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

export type CursorDirection = 'forward' | 'backward' | 'none';

export class Cursor {
  public readonly start: number;

  public readonly end: number;

  public readonly direction: CursorDirection;

  constructor(start: number, end: number, direction: CursorDirection) {
    this.start = start;
    this.end = end;
    this.direction = direction;
  }

  static fromTextAreaElement(element: HTMLTextAreaElement) {
    return new Cursor(element.selectionStart, element.selectionEnd, element.selectionDirection);
  }

  public get selection() {
    return this.start !== this.end;
  }

  public get length() {
    return this.end - this.start;
  }
}
