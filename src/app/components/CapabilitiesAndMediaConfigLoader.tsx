import { ReactNode, useCallback, useEffect } from 'react';
import { Capabilities } from 'matrix-js-sdk';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { MediaConfig } from '../hooks/useMediaConfig';
import { promiseFulfilledResult } from '../utils/common';

type CapabilitiesAndMediaConfigLoaderProps = {
  children: (capabilities?: Capabilities, mediaConfig?: MediaConfig) => ReactNode;
};
export function CapabilitiesAndMediaConfigLoader({
  children,
}: CapabilitiesAndMediaConfigLoaderProps) {
  const mx = useMatrixClient();

  const [state, load] = useAsyncCallback<
    [Capabilities | undefined, MediaConfig | undefined],
    unknown,
    []
  >(
    useCallback(async () => {
      const result = await Promise.allSettled([mx.getCapabilities(), mx.getMediaConfig()]);
      const capabilities = promiseFulfilledResult(result[0]);
      const mediaConfig = promiseFulfilledResult(result[1]);
      return [capabilities, mediaConfig];
    }, [mx])
  );

  useEffect(() => {
    load();
  }, [load]);

  const [capabilities, mediaConfig] =
    state.status === AsyncStatus.Success ? state.data : [undefined, undefined];
  return children(capabilities, mediaConfig);
}
