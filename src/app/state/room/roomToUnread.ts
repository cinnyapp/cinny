import { atom, useSetAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { ThreadId } from '../../../types/matrix/room';
import { useObservableValue, useObservableValuePromise } from '../../hooks/useObservableValue';
import { getReadReceiptId } from '../../../client/storage/collections';
import { ClientContext } from '../../../client/context';

export const roomToUnreadAtom = atom(new Map());

export const unreadRoomsAtom = atom<Set<string>>(new Set<string>());

export const useBindUnreadRoomsAtom = (ct: ClientContext, unreadRooms: typeof unreadRoomsAtom) => {
  const setUnreadRooms = useSetAtom(unreadRooms);
  const roomToLatestEvent = useObservableValue(ct.roomToLatestEvent);

  const receiptKeys: string[] = useMemo(() => {
    const keys: string[] = [];
    roomToLatestEvent.forEach((_, roomId) => {
      keys.push(getReadReceiptId(roomId, ct.session.userId, ThreadId.Main));
    });

    return keys;
  }, [roomToLatestEvent, ct]);

  const receiptsResult = useObservableValuePromise(
    useMemo(() => ct.storage.readReceipt.observableRead.getMultiple(receiptKeys), [ct, receiptKeys])
  );

  useEffect(() => {
    const receipts = receiptsResult.value;
    if (receipts) {
      const rooms: string[] = [];
      Array.from(roomToLatestEvent.entries()).forEach(([roomId, event], index) => {
        const receipt = receipts[index];
        if (!receipt || receipt.ts > event.origin_server_ts) return;
        rooms.push(roomId);
      });

      setUnreadRooms(new Set(rooms));
    }
  }, [setUnreadRooms, receiptsResult, roomToLatestEvent]);
};
