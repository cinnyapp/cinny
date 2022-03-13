/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import initMatrix from '../../client/initMatrix';
import cons from '../../client/state/cons';

export function useCategorizedSpaces() {
  const { accountData } = initMatrix;
  const [categorizedSpaces, setCategorizedSpaces] = useState([...accountData.categorizedSpaces]);

  useEffect(() => {
    const handleCategorizedSpaces = () => {
      setCategorizedSpaces([...accountData.categorizedSpaces]);
    };
    accountData.on(cons.events.accountData.CATEGORIZE_SPACE_UPDATED, handleCategorizedSpaces);
    return () => {
      accountData.removeListener(
        cons.events.accountData.CATEGORIZE_SPACE_UPDATED,
        handleCategorizedSpaces,
      );
    };
  }, []);

  return [categorizedSpaces];
}
