/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import initMatrix from '../../client/initMatrix';
import { hasCrossSigningAccountData } from '../../util/matrixUtil';

export function useCrossSigningStatus() {
  const mx = initMatrix.matrixClient;
  const [isCSEnabled, setIsCSEnabled] = useState(hasCrossSigningAccountData());

  useEffect(() => {
    if (isCSEnabled) return null;
    const handleAccountData = (event) => {
      if (event.getType() === 'm.cross_signing.master') {
        setIsCSEnabled(true);
      }
    };

    mx.on('accountData', handleAccountData);
    return () => {
      mx.removeListener('accountData', handleAccountData);
    };
  }, [isCSEnabled === false]);
  return isCSEnabled;
}
