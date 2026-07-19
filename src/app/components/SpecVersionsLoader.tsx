import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { SpecVersions, specVersions } from '../cs-api';

const getSpecVersionKey = (baseUrl: string) => `specVersions:${baseUrl}`;
const setSpecVersions = (baseUrl: string, data: SpecVersions) => {
  localStorage.setItem(getSpecVersionKey(baseUrl), JSON.stringify(data));
};

const getSpecVersions = (baseUrl: string): SpecVersions | undefined => {
  try {
    const dataStr = localStorage.getItem(getSpecVersionKey(baseUrl));
    if (dataStr === null) return undefined;
    const data = JSON.parse(dataStr);
    if (typeof data === 'object' && 'versions' in data && Array.isArray(data.versions)) {
      return data;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

const FALLBACK_DATA: SpecVersions = {
  versions: [],
};

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
    useCallback(async () => {
      const data = await specVersions(fetch, baseUrl);
      setSpecVersions(baseUrl, data);
      return data;
    }, [baseUrl])
  );

  const data = state.status === AsyncStatus.Success ? state.data : getSpecVersions(baseUrl);

  const [ignoreError, setIgnoreError] = useState(false);

  const ignoreCallback = useCallback(() => setIgnoreError(true), []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && (state.status === AsyncStatus.Idle || state.status === AsyncStatus.Loading)) {
    return fallback?.();
  }

  if (!data && !ignoreError && state.status === AsyncStatus.Error) {
    return error?.(state.error, load, ignoreCallback);
  }

  return children(state.status === AsyncStatus.Success ? state.data : data ?? FALLBACK_DATA);
}
