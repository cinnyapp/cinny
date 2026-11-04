/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback, useSyncExternalStore } from 'react';
import { useClient } from './useClient';
import { useRoom } from './useRoom';
import { getReadReceiptId } from '../../client/storage/collections';
import { ThreadId } from '../../types/matrix/room';

export const useUserReadReceipt = (threadId?: string) => {
  const ct = useClient();
  const roomId = useRoom();

  const receipt = useSyncExternalStore(
    useCallback((c) => ct.userReadReceipt.subscribe(c), [ct]),
    useCallback(
      () =>
        ct.userReadReceipt.read.find(
          (r) => getReadReceiptId(roomId, ct.session.userId, threadId ?? ThreadId.Main) === r.id
        ),
      [ct, roomId, threadId]
    )
  );

  return receipt;
};
