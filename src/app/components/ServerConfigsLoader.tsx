import { ReactNode, useCallback, useMemo } from 'react';
import { Capabilities, validateAuthMetadata, ValidatedAuthMetadata } from 'matrix-js-sdk';
import { AsyncStatus, useAsyncCallbackValue } from '../hooks/useAsyncCallback';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { MediaConfig } from '../hooks/useMediaConfig';
import { promiseFulfilledResult } from '../utils/common';
import { probeAuthMetadata } from '../utils/authMetadataProbe';

export type ServerConfigs = {
  capabilities?: Capabilities;
  mediaConfig?: MediaConfig;
  authMetadata?: ValidatedAuthMetadata;
};

type ServerConfigsLoaderProps = {
  children: (configs: ServerConfigs) => ReactNode;
};
export function ServerConfigsLoader({ children }: ServerConfigsLoaderProps) {
  const mx = useMatrixClient();
  const fallbackConfigs = useMemo(() => ({}), []);

  const [configsState] = useAsyncCallbackValue<ServerConfigs, unknown>(
    useCallback(async () => {
      const result = await Promise.allSettled([
        mx.getCapabilities(),
        mx.getMediaConfig(),
        probeAuthMetadata(mx.getHomeserverUrl(), () => mx.getAuthMetadata()),
      ]);

      const capabilities = promiseFulfilledResult(result[0]);
      const mediaConfig = promiseFulfilledResult(result[1]);
      const authMetadata = promiseFulfilledResult(result[2]);
      let validatedAuthMetadata: ValidatedAuthMetadata | undefined;

      // No metadata at all is the normal case on a password-login homeserver -
      // only complain about metadata that exists but is invalid.
      if (authMetadata) {
        try {
          validatedAuthMetadata = validateAuthMetadata(authMetadata);
        } catch (e) {
          console.error(e);
        }
      }

      return {
        capabilities,
        mediaConfig,
        authMetadata: validatedAuthMetadata,
      };
    }, [mx])
  );

  const configs: ServerConfigs =
    configsState.status === AsyncStatus.Success ? configsState.data : fallbackConfigs;

  return children(configs);
}
