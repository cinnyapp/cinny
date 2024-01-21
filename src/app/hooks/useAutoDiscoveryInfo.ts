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
