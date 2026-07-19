import { atom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { ClientContext } from '../../../client/context';

export const allInvitesAtom = atom<string[]>([]);

export const useBindAllInvitesAtom = (ct: ClientContext, allRooms: typeof allInvitesAtom) => {
  const setRoomsAtom = useSetAtom(allRooms);

  useEffect(() => {
    setRoomsAtom(ct.rooms.invite.read);

    const unsubscribe = ct.rooms.invite.subscribe((rooms) => {
      setRoomsAtom(rooms);
    });

    return unsubscribe;
  }, [ct, setRoomsAtom]);
};
