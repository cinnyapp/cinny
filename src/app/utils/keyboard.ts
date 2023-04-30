import isHotkey from 'is-hotkey';
import { KeyboardEvent } from 'react';

export const onTabPress = (evt: KeyboardEvent<Element>, callback: () => void) => {
  if (isHotkey('tab', evt)) {
    evt.preventDefault();
    callback();
  }
};
