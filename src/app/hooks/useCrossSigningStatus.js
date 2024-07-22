/* eslint-disable import/prefer-default-export */
import { useState, useEffect } from 'react';

import { hasCrossSigningAccountData } from '../../util/matrixUtil';
import { useMatrixClient } from './useMatrixClient';

export function useCrossSigningStatus() {
  const mx = useMatrixClient();
  const [isCSEnabled, setIsCSEnabled] = useState(hasCrossSigningAccountData(mx));

  useEffect(() => {
    if (isCSEnabled) return undefined;
    const handleAccountData = (event) => {
      if (event.getType() === 'm.cross_signing.master') {
        setIsCSEnabled(true);
      }
    };

    mx.on('accountData', handleAccountData);
    return () => {
      mx.removeListener('accountData', handleAccountData);
    };
  }, [mx, isCSEnabled]);
  return isCSEnabled;
}
