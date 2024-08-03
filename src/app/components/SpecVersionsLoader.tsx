import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { SpecVersions, specVersions } from '../cs-api';

type SpecVersionsLoaderProps = {
  baseUrl: string;
  fallback?: () => ReactNode;
  error?: (err: unknown, retry: () => void, ignore: () => void) => ReactNode;
  children: (versions: SpecVersions) => ReactNode;
};
export function SpecVersionsLoader({
  baseUrl,
  fallback,
  error,
  children,
}: SpecVersionsLoaderProps) {
  const [state, load] = useAsyncCallback(
    useCallback(() => specVersions(fetch, baseUrl), [baseUrl])
  );
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

  return children(
    state.status === AsyncStatus.Success
      ? state.data
      : {
          versions: [],
        }
  );
}
