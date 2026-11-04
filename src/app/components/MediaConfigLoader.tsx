// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ReactNode, useCallback, useEffect } from 'react';
import { getConfig, GetConfigOK } from 'neurone/lib/api/matrix/client/v1/media';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { MediaConfig } from '../hooks/useMediaConfig';
import { useClient } from '../hooks/useClient';

type MediaConfigLoaderProps = {
  children: (mediaConfig: MediaConfig | undefined) => ReactNode;
};
export function MediaConfigLoader({ children }: MediaConfigLoaderProps) {
  const ct = useClient();

  const [state, load] = useAsyncCallback(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(getConfig({}));

      const [, config] = await parseMatrixResp<GetConfigOK>(resp);

      return config;
    }, [ct])
  );

  useEffect(() => {
    load();
  }, [load]);

  return children(state.status === AsyncStatus.Success ? state.data : undefined);
}
