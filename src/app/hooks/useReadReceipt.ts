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
