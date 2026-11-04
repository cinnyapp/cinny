/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { createContext, useContext } from 'react';
import { AutoDiscoveryInfo } from '../cs-api';

const AutoDiscoverInfoContext = createContext<AutoDiscoveryInfo | null>(null);

export const AutoDiscoveryInfoProvider = AutoDiscoverInfoContext.Provider;

export const useAutoDiscoveryInfo = (): AutoDiscoveryInfo => {
  const autoDiscoveryInfo = useContext(AutoDiscoverInfoContext);
  if (!autoDiscoveryInfo) {
    throw new Error('Auto Discovery Info not loaded');
  }

  return autoDiscoveryInfo;
};
