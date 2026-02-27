import { createContext, useContext } from 'react';

export type HashRouterConfig = {
  enabled?: boolean;
  basename?: string;
};

export type ClientConfig = {
  defaultHomeserver?: number;
  homeserverList?: string[];
  allowCustomHomeservers?: boolean;

  featuredCommunities?: {
    openAsDefault?: boolean;
    spaces?: string[];
    rooms?: string[];
    servers?: string[];
  };

  hashRouter?: HashRouterConfig;

  /**
   * URL of the lk-jwt-service used for LiveKit voice/video calls.
   * Example: "https://lk-jwt-service.example.com"
   * See: https://github.com/element-hq/lk-jwt-service
   */
  lkJwtServiceUrl?: string;
};

const ClientConfigContext = createContext<ClientConfig | null>(null);

export const ClientConfigProvider = ClientConfigContext.Provider;

export function useClientConfig(): ClientConfig {
  const config = useContext(ClientConfigContext);
  if (!config) throw new Error('Client config are not provided!');
  return config;
}

export const clientDefaultServer = (clientConfig: ClientConfig): string =>
  clientConfig.homeserverList?.[clientConfig.defaultHomeserver ?? 0] ?? 'matrix.org';

export const clientAllowedServer = (clientConfig: ClientConfig, server: string): boolean => {
  const { homeserverList, allowCustomHomeservers } = clientConfig;

  if (allowCustomHomeservers) return true;

  return homeserverList?.includes(server) === true;
};
