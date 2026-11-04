// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { atom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { ClientContext } from '../../../client/context';

export const allRoomsAtom = atom<string[]>([]);

export const useBindAllRoomsAtom = (ct: ClientContext, allRooms: typeof allRoomsAtom) => {
  const setRoomsAtom = useSetAtom(allRooms);

  useEffect(() => {
    setRoomsAtom(ct.rooms.join.read);

    const unsubscribe = ct.rooms.join.subscribe((rooms) => {
      setRoomsAtom(rooms);
    });

    return unsubscribe;
  }, [ct, setRoomsAtom]);
};
