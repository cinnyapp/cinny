/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo, useCallback, KeyboardEventHandler, MutableRefObject } from 'react';
import { isKeyHotkey } from 'is-hotkey';
import { TextArea, Intent, TextAreaOperations, Cursor } from '../plugins/text-area';
import { useTextAreaIntentHandler } from './useTextAreaIntent';
import { GetTarget } from '../plugins/text-area/type';

export const useTextAreaCodeEditor = (
  textAreaRef: MutableRefObject<HTMLTextAreaElement | null>,
  intentSpaceCount: number
) => {
  const getTarget: GetTarget = useCallback(() => {
    const target = textAreaRef.current;
    if (!target) throw new Error('TextArea element not found!');
    return target;
  }, [textAreaRef]);

  const { textArea, operations, intent } = useMemo(() => {
    const ta = new TextArea(getTarget);
    const op = new TextAreaOperations(getTarget);
    return {
      textArea: ta,
      operations: op,
      intent: new Intent(intentSpaceCount, ta, op),
    };
  }, [getTarget, intentSpaceCount]);

  const intentHandler = useTextAreaIntentHandler(textArea, operations, intent);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (evt) => {
    intentHandler(evt);
    if (isKeyHotkey('escape', evt)) {
      const cursor = Cursor.fromTextAreaElement(getTarget());
      operations.deselect(cursor);
    }
  };

  return {
    handleKeyDown,
    textArea,
    intent,
    getTarget,
    operations,
  };
};
