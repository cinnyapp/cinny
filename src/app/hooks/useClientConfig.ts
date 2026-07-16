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
   * In-app message translation (offline "Libre"/argos backend on Chagai's server).
   * Configured in public/config.json so the URL/token can change without a rebuild.
   * - endpoint: base URL of the translate API (e.g. "https://mx.chagai.website/translate-api").
   *   If unset, the translation feature is hidden entirely.
   * - token: shared bearer secret the API requires (sent as Authorization: Bearer <token>).
   * - defaultTargetLang: fallback target language when none is chosen (default "en").
   */
  translation?: {
    endpoint?: string;
    token?: string;
    defaultTargetLang?: string;
  };
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
