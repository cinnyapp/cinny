import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { SpecVersions, specVersions } from '../cs-api';

// /versions is the only network round-trip in front of the start-up screen.
// Render from the last good answer right away and revalidate in the background
// (also makes the start-up list work offline). Falls back to today's path
// when nothing is cached.
const CACHE_PREFIX = 'cinny_spec_versions_v1:';
const cacheKey = (baseUrl: string) => `${CACHE_PREFIX}${baseUrl.replace(/\/+$/, '')}`;

const readCachedVersions = (baseUrl: string): SpecVersions | undefined => {
  try {
    const raw = localStorage.getItem(cacheKey(baseUrl));
    if (!raw) return undefined;
    const data = JSON.parse(raw) as unknown;
    if (data && typeof data === 'object' && Array.isArray((data as SpecVersions).versions)) {
      return data as SpecVersions;
    }
  } catch {
    // storage blocked / corrupt entry: behave as if nothing was cached
  }
  return undefined;
};

const writeCachedVersions = (baseUrl: string, versions: SpecVersions) => {
  try {
    localStorage.setItem(cacheKey(baseUrl), JSON.stringify(versions));
  } catch {
    // ignore (quota / private mode)
  }
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
      const versions = await specVersions(fetch, baseUrl);
      writeCachedVersions(baseUrl, versions);
      return versions;
    }, [baseUrl])
  );
  const [cached] = useState(() => readCachedVersions(baseUrl));
  const [ignoreError, setIgnoreError] = useState(false);

  const ignoreCallback = useCallback(() => setIgnoreError(true), []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === AsyncStatus.Idle || state.status === AsyncStatus.Loading) {
    if (cached) return children(cached);
    return fallback?.();
  }

  if (state.status === AsyncStatus.Error && cached) {
    // the server could not be asked right now: keep going with the last good answer
    return children(cached);
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
