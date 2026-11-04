// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ReactNode, useCallback, useEffect } from 'react';
import { getCapabilities, GetCapabilitiesOK } from 'neurone/lib/api/matrix/client/v3/capabilities';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useClient } from '../hooks/useClient';
import { Capabilities } from '../hooks/useCapabilities';

type CapabilitiesLoaderProps = {
  children: (capabilities: Capabilities | undefined) => ReactNode;
};
export function CapabilitiesLoader({ children }: CapabilitiesLoaderProps) {
  const ct = useClient();

  const [state, load] = useAsyncCallback(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(getCapabilities({}));
      const [, result] = await parseMatrixResp<GetCapabilitiesOK>(resp);
      return result?.capabilities;
    }, [ct])
  );

  useEffect(() => {
    load();
  }, [load]);

  return children(state.status === AsyncStatus.Success ? state.data : undefined);
}
