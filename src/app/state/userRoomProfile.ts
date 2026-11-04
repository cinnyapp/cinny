/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { Position, RectCords } from 'folds';
import { atom } from 'jotai';

export type UserRoomProfileState = {
  userId: string;
  roomId: string;
  spaceId?: string;
  cords: RectCords;
  position?: Position;
};

export const userRoomProfileAtom = atom<UserRoomProfileState | undefined>(undefined);
