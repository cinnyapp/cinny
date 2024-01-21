import { ReactNode, useCallback, useEffect } from 'react';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { SpecVersions, specVersions } from '../cs-api';
import { useAutoDiscoveryInfo } from '../hooks/useAutoDiscoveryInfo';

type SpecVersionsLoaderProps = {
  fallback?: () => ReactNode;
  error?: (err: unknown) => ReactNode;
  children: (versions: SpecVersions) => ReactNode;
};
export function SpecVersionsLoader({ fallback, error, children }: SpecVersionsLoaderProps) {
  const autoDiscoveryInfo = useAutoDiscoveryInfo();
  const baseUrl = autoDiscoveryInfo['m.homeserver'].base_url;

  const [state, load] = useAsyncCallback(
    useCallback(() => specVersions(fetch, baseUrl), [baseUrl])
  );

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === AsyncStatus.Idle || state.status === AsyncStatus.Loading) {
    return fallback?.();
  }

  if (state.status === AsyncStatus.Error) {
    return error?.(state.error);
  }

  return children(state.data);
}
