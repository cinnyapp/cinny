// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { atom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { RoomToParents } from '../../../types/matrix/room';
import { ClientContext } from '../../../client/context';

const baseRoomToParents = atom<RoomToParents>(new Map());
export const roomToParentsAtom = atom<RoomToParents, [RoomToParents], void>(
  (get) => get(baseRoomToParents),
  (get, set, roomToParents) => {
    set(baseRoomToParents, roomToParents);
  }
);

export const useBindRoomToParentsAtom = (
  ct: ClientContext,
  roomToParents: typeof roomToParentsAtom
) => {
  const setRoomToParents = useSetAtom(roomToParents);

  useEffect(() => {
    setRoomToParents(ct.roomToParents.read);

    const unsubscribe = ct.roomToParents.subscribe((data) => {
      setRoomToParents(data);
    });

    return unsubscribe;
  }, [ct, setRoomToParents]);
};
