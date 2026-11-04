// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { isKeyHotkey } from 'is-hotkey';
import { KeyboardEventHandler } from 'react';

export interface KeyboardEventLike {
  key: string;
  which: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  preventDefault(): void;
}

export const onTabPress = (evt: KeyboardEventLike, callback: () => void) => {
  if (isKeyHotkey('tab', evt)) {
    evt.preventDefault();
    callback();
  }
};

export const preventScrollWithArrowKey: KeyboardEventHandler = (evt) => {
  if (isKeyHotkey(['arrowup', 'arrowright', 'arrowdown', 'arrowleft'], evt)) {
    evt.preventDefault();
  }
};

export const onEnterOrSpace =
  <T>(callback: (evt: T) => void) =>
  (evt: KeyboardEventLike) => {
    if (isKeyHotkey('enter', evt) || isKeyHotkey('space', evt)) {
      evt.preventDefault();
      callback(evt as T);
    }
  };

export const stopPropagation = (evt: KeyboardEvent): boolean => {
  const ae = document.activeElement;
  const editableActiveElement = ae
    ? ae.nodeName.toLowerCase() === 'input' ||
      ae.nodeName.toLowerCase() === 'textarea' ||
      ae.getAttribute('contenteditable') === 'true'
    : false;

  if (editableActiveElement) return false;

  evt.stopPropagation();
  return true;
};
