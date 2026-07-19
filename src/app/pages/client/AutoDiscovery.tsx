import React, { ReactNode, useCallback, useMemo } from 'react';
import { AutoDiscoveryInfoProvider } from '../../hooks/useAutoDiscoveryInfo';
import { AsyncStatus, useAsyncCallbackValue } from '../../hooks/useAsyncCallback';
import { autoDiscovery, AutoDiscoveryInfo } from '../../cs-api';
import { getMxIdServer } from '../../utils/matrix';

type AutoDiscoveryProps = {
  userId: string;
  baseUrl: string;
  children: ReactNode;
};
export function AutoDiscovery({ userId, baseUrl, children }: AutoDiscoveryProps) {
  const [state] = useAsyncCallbackValue(
    useCallback(async () => {
      const server = getMxIdServer(userId);
      return autoDiscovery(fetch, server ?? userId);
    }, [userId])
  );

  const [, info] = state.status === AsyncStatus.Success ? state.data : [];

  const fallback: AutoDiscoveryInfo = useMemo(
    () => ({
      'm.homeserver': {
        base_url: baseUrl,
      },
    }),
    [baseUrl]
  );

  return <AutoDiscoveryInfoProvider value={info ?? fallback}>{children}</AutoDiscoveryInfoProvider>;
}
