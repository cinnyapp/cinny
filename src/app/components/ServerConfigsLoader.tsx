import { ReactNode, useCallback, useMemo } from 'react';
import { getCapabilities, GetCapabilitiesOK } from 'neurone/lib/api/matrix/client/v3/capabilities';
import { getConfig, GetConfigOK } from 'neurone/lib/api/matrix/client/v1/media';
import { getAuthMetadata, GetAuthMetadataOK } from 'neurone/lib/api/matrix/client/v1/authMetadata';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AsyncStatus, useAsyncCallbackValue } from '../hooks/useAsyncCallback';
import { promiseFulfilledResult } from '../utils/common';
import { useClient } from '../hooks/useClient';
import { MediaConfig } from '../hooks/useMediaConfig';
import { Capabilities } from '../hooks/useCapabilities';
import { getJSONRequest } from '../../client/request';

export type ServerConfigs = {
  capabilities?: Capabilities;
  mediaConfig?: MediaConfig;
  authMetadata?: GetAuthMetadataOK;
};

type ServerConfigsLoaderProps = {
  children: (configs: ServerConfigs) => ReactNode;
};
export function ServerConfigsLoader({ children }: ServerConfigsLoaderProps) {
  const ct = useClient();
  const fallbackConfigs = useMemo(() => ({}), []);

  const [configsState] = useAsyncCallbackValue<ServerConfigs, unknown>(
    useCallback(async () => {
      const result = await Promise.allSettled([
        ct.requestAuthJSON(getCapabilities({})).then(parseMatrixResp<GetCapabilitiesOK>),
        ct.requestAuthJSON(getConfig({})).then(parseMatrixResp<GetConfigOK>),
        getJSONRequest(ct.session.baseUrl)(getAuthMetadata({})).then(
          parseMatrixResp<GetAuthMetadataOK>
        ),
      ]);

      const [, capResult] = promiseFulfilledResult(result[0]) ?? [];
      const [, mediaConfig] = promiseFulfilledResult(result[1]) ?? [];
      const [, authMetadata] = promiseFulfilledResult(result[2]) ?? [];

      return {
        capabilities: capResult?.capabilities,
        mediaConfig,
        authMetadata,
      };
    }, [ct])
  );

  const configs: ServerConfigs =
    configsState.status === AsyncStatus.Success ? configsState.data : fallbackConfigs;

  return children(configs);
}
