/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import initMatrix from '../../client/initMatrix';
import { hasCrossSigninAccountData } from '../../util/matrixUtil';

export function useCrossSigninStatus() {
  const mx = initMatrix.matrixClient;
  const [isCSEnabled, setIsCSEnbaled] = useState(hasCrossSigninAccountData());

  useEffect(() => {
    if (isCSEnabled) return null;
    const handleAccountData = (event) => {
      if (event.getType() === 'm.cross_signing.master') {
        setIsCSEnbaled(true);
      }
    };

    mx.on('accountData', handleAccountData);
    return () => {
      mx.removeListener('accountData', handleAccountData);
    };
  }, [isCSEnabled === false]);
  return isCSEnabled;
}
