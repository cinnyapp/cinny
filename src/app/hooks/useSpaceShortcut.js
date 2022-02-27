/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import initMatrix from '../../client/initMatrix';
import cons from '../../client/state/cons';

export function useSpaceShortcut() {
  const { accountData } = initMatrix;
  const [spaceShortcut, setSpaceShortcut] = useState([...accountData.spaceShortcut]);

  useEffect(() => {
    const onSpaceShortcutUpdated = () => {
      setSpaceShortcut([...accountData.spaceShortcut]);
    };
    accountData.on(cons.events.accountData.SPACE_SHORTCUT_UPDATED, onSpaceShortcutUpdated);
    return () => {
      accountData.removeListener(
        cons.events.accountData.SPACE_SHORTCUT_UPDATED,
        onSpaceShortcutUpdated,
      );
    };
  }, []);

  return [spaceShortcut];
}
