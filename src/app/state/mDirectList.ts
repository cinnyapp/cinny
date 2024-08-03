import { atom, useSetAtom } from 'jotai';
import { ClientEvent, MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { useEffect } from 'react';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { getAccountData, getMDirects } from '../utils/room';

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

export const useBindMDirectAtom = (mx: MatrixClient, mDirect: typeof mDirectAtom) => {
  const setMDirect = useSetAtom(mDirect);

  useEffect(() => {
    const mDirectEvent = getAccountData(mx, AccountDataEvent.Direct);
    if (mDirectEvent) {
      setMDirect({
        type: 'INITIALIZE',
        rooms: getMDirects(mDirectEvent),
      });
    }

    const handleAccountData = (event: MatrixEvent) => {
      if (event.getType() === AccountDataEvent.Direct) {
        setMDirect({
          type: 'UPDATE',
          rooms: getMDirects(event),
        });
      }
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
    };
  }, [mx, setMDirect]);
};
