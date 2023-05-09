import isHotkey from 'is-hotkey';
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
  if (isHotkey('tab', evt)) {
    evt.preventDefault();
    callback();
  }
};

export const preventScrollWithArrowKey: KeyboardEventHandler = (evt) => {
  if (isHotkey(['arrowup', 'arrowright', 'arrowdown', 'arrowleft'], evt)) {
    evt.preventDefault();
  }
};
