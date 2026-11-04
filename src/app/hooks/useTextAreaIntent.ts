// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { isKeyHotkey } from 'is-hotkey';
import { KeyboardEventHandler, useCallback } from 'react';
import { Cursor, Intent, Operations, TextArea } from '../plugins/text-area';

export const useTextAreaIntentHandler = (
  textArea: TextArea,
  operations: Operations,
  intent: Intent
) => {
  const handler: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (evt) => {
      const target = evt.currentTarget;

      if (isKeyHotkey('tab', evt)) {
        evt.preventDefault();

        const cursor = Cursor.fromTextAreaElement(target);
        if (textArea.selection(cursor)) {
          operations.select(intent.moveForward(cursor));
        } else {
          operations.deselect(operations.insert(cursor, intent.str));
        }

        target.focus();
      }
      if (isKeyHotkey('shift+tab', evt)) {
        evt.preventDefault();
        const cursor = Cursor.fromTextAreaElement(target);
        const intentCursor = intent.moveBackward(cursor);
        if (textArea.selection(cursor)) {
          operations.select(intentCursor);
        } else {
          operations.deselect(intentCursor);
        }

        target.focus();
      }
      if (isKeyHotkey('enter', evt) || isKeyHotkey('shift+enter', evt)) {
        evt.preventDefault();
        const cursor = Cursor.fromTextAreaElement(target);
        operations.select(intent.addNewLine(cursor));
      }
      if (isKeyHotkey('mod+enter', evt)) {
        evt.preventDefault();
        const cursor = Cursor.fromTextAreaElement(target);
        operations.select(intent.addNextLine(cursor));
      }
      if (isKeyHotkey('mod+shift+enter', evt)) {
        evt.preventDefault();
        const cursor = Cursor.fromTextAreaElement(target);
        operations.select(intent.addPreviousLine(cursor));
      }
    },
    [textArea, operations, intent]
  );

  return handler;
};
