/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Position, RectCords } from 'folds';
import { userRoomProfileAtom, UserRoomProfileState } from '../userRoomProfile';

export const useUserRoomProfileState = (): UserRoomProfileState | undefined => {
  const data = useAtomValue(userRoomProfileAtom);

  return data;
};

type CloseCallback = () => void;
export const useCloseUserRoomProfile = (): CloseCallback => {
  const setUserRoomProfile = useSetAtom(userRoomProfileAtom);

  const close: CloseCallback = useCallback(() => {
    setUserRoomProfile(undefined);
  }, [setUserRoomProfile]);

  return close;
};

type OpenCallback = (
  roomId: string,
  spaceId: string | undefined,
  userId: string,
  cords: RectCords,
  position?: Position
) => void;
export const useOpenUserRoomProfile = (): OpenCallback => {
  const setUserRoomProfile = useSetAtom(userRoomProfileAtom);

  const open: OpenCallback = useCallback(
    (roomId, spaceId, userId, cords, position) => {
      setUserRoomProfile({ roomId, spaceId, userId, cords, position });
    },
    [setUserRoomProfile]
  );

  return open;
};
