import { createContext, useContext } from 'react';

export type ClientConfig = {
  appVersion?: string;
  basename?: string;
  defaultHomeserver?: number;
  homeserverList?: string[];
  allowCustomHomeservers?: boolean;
};

const ClientConfigContext = createContext<ClientConfig | null>(null);

export const ClientConfigProvider = ClientConfigContext.Provider;

export function useClientConfig(): ClientConfig {
  const config = useContext(ClientConfigContext);
  if (!config) throw new Error('Client config are not provided!');
  return config;
}
