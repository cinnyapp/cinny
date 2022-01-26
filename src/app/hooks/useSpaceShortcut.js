/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import initMatrix from '../../client/initMatrix';
import cons from '../../client/state/cons';

export function useSpaceShortcut() {
  const { roomList } = initMatrix;
  const [spaceShortcut, setSpaceShortcut] = useState([...roomList.spaceShortcut]);

  useEffect(() => {
    const onSpaceShortcutUpdated = () => {
      setSpaceShortcut([...roomList.spaceShortcut]);
    };
    roomList.on(cons.events.roomList.SPACE_SHORTCUT_UPDATED, onSpaceShortcutUpdated);
    return () => {
      roomList.removeListener(cons.events.roomList.SPACE_SHORTCUT_UPDATED, onSpaceShortcutUpdated);
    };
  }, []);

  return [spaceShortcut];
}
