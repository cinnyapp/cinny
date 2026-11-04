/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { createContext, useContext } from 'react';

const RoomContext = createContext<string | null>(null);

export const RoomProvider = RoomContext.Provider;

export function useRoom(): string {
  const room = useContext(RoomContext);
  if (!room) throw new Error('Room not provided!');
  return room;
}

const IsDirectRoomContext = createContext<boolean>(false);

export const IsDirectRoomProvider = IsDirectRoomContext.Provider;

export const useIsDirectRoom = () => {
  const direct = useContext(IsDirectRoomContext);

  return direct;
};
