/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect } from 'react';

export const useNetworkOnlineCallback = (callback: () => void) => {
  useEffect(() => {
    const handleNetwork = () => callback();

    window.addEventListener('online', handleNetwork);
    return () => {
      window.removeEventListener('online', handleNetwork);
    };
  }, [callback]);
};

export const useNetworkOfflineCallback = (callback: () => void) => {
  useEffect(() => {
    const handleNetwork = () => callback();

    window.addEventListener('offline', handleNetwork);
    return () => {
      window.removeEventListener('offline', handleNetwork);
    };
  }, [callback]);
};
