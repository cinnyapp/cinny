import { Capabilities } from 'matrix-js-sdk';
import { createContext, useContext } from 'react';

const CapabilitiesContext = createContext<Capabilities | null>(null);

export const CapabilitiesProvider = CapabilitiesContext.Provider;

export function useCapabilities(): Capabilities {
  const capabilities = useContext(CapabilitiesContext);
  if (!capabilities) throw new Error('Capabilities are not provided!');
  return capabilities;
}
