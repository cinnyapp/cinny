import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { ClientConfig } from '../hooks/useClientConfig';
import { trimTrailingSlash } from '../utils/common';

const getClientConfig = async (): Promise<ClientConfig> => {
  const url = `${trimTrailingSlash(import.meta.env.BASE_URL)}/config.json`;
  const config = await fetch(url, { method: 'GET' });
  return config.json();
};

type ClientConfigLoaderProps = {
  fallback?: () => ReactNode;
  error?: (err: unknown, retry: () => void, ignore: () => void) => ReactNode;
  children: (config: ClientConfig) => ReactNode;
};
export function ClientConfigLoader({ fallback, error, children }: ClientConfigLoaderProps) {
  const [state, load] = useAsyncCallback(getClientConfig);
  const [ignoreError, setIgnoreError] = useState(false);

  const ignoreCallback = useCallback(() => setIgnoreError(true), []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === AsyncStatus.Idle || state.status === AsyncStatus.Loading) {
    return fallback?.();
  }

  if (!ignoreError && state.status === AsyncStatus.Error) {
    return error?.(state.error, load, ignoreCallback);
  }

  const config: ClientConfig = state.status === AsyncStatus.Success ? state.data : {};

  return children(config);
}
