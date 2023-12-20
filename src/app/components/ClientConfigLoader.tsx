import { ReactNode } from 'react';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { ClientConfig } from '../hooks/useClientConfig';

const getClientConfig = async (): Promise<ClientConfig> => {
  const config = await fetch('/config.json', { method: 'GET' });
  return config.json();
};

type ClientConfigLoaderProps = {
  fallback?: () => ReactNode;
  children: (config: ClientConfig) => ReactNode;
};
export function ClientConfigLoader({ fallback, children }: ClientConfigLoaderProps) {
  const [state, load] = useAsyncCallback(getClientConfig);

  if (state.status === AsyncStatus.Idle) load();

  if (state.status === AsyncStatus.Idle || state.status === AsyncStatus.Loading) {
    return fallback?.();
  }

  const config: ClientConfig = state.status === AsyncStatus.Success ? state.data : {};

  return children(config);
}
