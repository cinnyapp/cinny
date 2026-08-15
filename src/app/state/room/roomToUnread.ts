import { atom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { ThreadId } from '../../../types/matrix/room';
import { useObservableValue } from '../../hooks/useObservableValue';
import { getReadReceiptId } from '../../../client/storage/collections';
import { ClientContext } from '../../../client/context';

export const unreadRoomsAtom = atom<Set<string>>(new Set<string>());

export const useBindUnreadRoomsAtom = (ct: ClientContext, unreadRooms: typeof unreadRoomsAtom) => {
  const setUnreadRooms = useSetAtom(unreadRooms);
  const roomToLatestEvent = useObservableValue(ct.roomToLatestEvent);
  const userReadReceipts = useObservableValue(ct.userReadReceipt);

  useEffect(() => {
    const unreads = new Set<string>();

    Array.from(roomToLatestEvent.entries()).forEach(([roomId, event]) => {
      const receipt = userReadReceipts.find(
        (r) => getReadReceiptId(roomId, ct.session.userId, ThreadId.Main) === r.id
      );
      if (!receipt || receipt.ts > event.origin_server_ts) return;
      unreads.add(roomId);
    });

    setUnreadRooms(unreads);
  }, [ct, setUnreadRooms, userReadReceipts, roomToLatestEvent]);
};
