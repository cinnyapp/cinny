import { atom, useSetAtom } from 'jotai';
import { ClientEvent, MatrixClient, MatrixEvent, RoomEvent, RoomStateEvent } from 'matrix-js-sdk';
import { useEffect } from 'react';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { getAccountData, getMDirects } from '../utils/room';
import { getBridgedDmRoomIds } from '../utils/dmAvatar';

export type MDirectAction = {
  type: 'INITIALIZE' | 'UPDATE';
  rooms: Set<string>;
};

const baseMDirectAtom = atom(new Set<string>());
export const mDirectAtom = atom<Set<string>, [MDirectAction], undefined>(
  (get) => get(baseMDirectAtom),
  (get, set, action) => {
    set(baseMDirectAtom, action.rooms);
  }
);

const sameSet = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false;
  let same = true;
  a.forEach((id) => {
    if (same && !b.has(id)) same = false;
  });
  return same;
};

const BRIDGE_TYPES = new Set(['m.bridge', 'uk.half-shot.bridge']);

/**
 * Direct chats = the m.direct account data PLUS every portal its bridge marks as
 * a 1:1 chat (m.bridge com.beeper.room_type "dm"). The Telegram bridge left
 * ~170 of his 1:1 chats out of m.direct, so they were listed as rooms. This
 * only changes what Cinny shows; nothing is written to the account.
 */
export const useBindMDirectAtom = (mx: MatrixClient, mDirect: typeof mDirectAtom) => {
  const setMDirect = useSetAtom(mDirect);

  useEffect(() => {
    let accountDirects = new Set<string>();
    let bridgedDirects = new Set<string>();
    let published: Set<string> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const publish = (type: MDirectAction['type']) => {
      const rooms = new Set(accountDirects);
      bridgedDirects.forEach((id) => rooms.add(id));
      if (published && sameSet(published, rooms)) return;
      published = rooms;
      setMDirect({ type, rooms });
    };

    const scanBridged = () => {
      timer = undefined;
      const next = getBridgedDmRoomIds(mx.getRooms());
      if (sameSet(next, bridgedDirects)) return;
      bridgedDirects = next;
      publish('UPDATE');
    };
    const scheduleScan = () => {
      if (timer === undefined) timer = setTimeout(scanBridged, 400);
    };

    const mDirectEvent = getAccountData(mx, AccountDataEvent.Direct);
    if (mDirectEvent) accountDirects = getMDirects(mDirectEvent);
    bridgedDirects = getBridgedDmRoomIds(mx.getRooms());
    if (mDirectEvent || bridgedDirects.size > 0) publish('INITIALIZE');

    const handleAccountData = (event: MatrixEvent) => {
      if (event.getType() === AccountDataEvent.Direct) {
        accountDirects = getMDirects(event);
        publish('UPDATE');
      }
    };
    const handleStateEvent = (event: MatrixEvent) => {
      if (BRIDGE_TYPES.has(event.getType())) scheduleScan();
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    mx.on(ClientEvent.Room, scheduleScan);
    mx.on(RoomEvent.MyMembership, scheduleScan);
    mx.on(RoomStateEvent.Events, handleStateEvent);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
      mx.removeListener(ClientEvent.Room, scheduleScan);
      mx.removeListener(RoomEvent.MyMembership, scheduleScan);
      mx.removeListener(RoomStateEvent.Events, handleStateEvent);
    };
  }, [mx, setMDirect]);
};
