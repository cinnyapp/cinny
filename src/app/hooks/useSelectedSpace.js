/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import cons from '../../client/state/cons';
import navigation from '../../client/state/navigation';

export function useSelectedSpace() {
  const [spaceId, setSpaceId] = useState(navigation.selectedSpaceId);

  useEffect(() => {
    const onSpaceSelected = (roomId) => {
      setSpaceId(roomId);
    };
    navigation.on(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    };
  }, []);

  return [spaceId];
}
