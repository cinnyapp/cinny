import { atom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { ClientContext } from '../../client/context';

export const mDirectAtom = atom(new Set<string>());

export const useBindMDirectAtom = (ct: ClientContext, mDirect: typeof mDirectAtom) => {
  const setMDirect = useSetAtom(mDirect);

  useEffect(() => {
    setMDirect(ct.directRooms.read);

    const unsubscribe = ct.directRooms.subscribe((rooms) => {
      setMDirect(rooms);
    });

    return unsubscribe;
  }, [ct, setMDirect]);
};
