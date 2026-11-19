/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { atom } from 'jotai';
import { CreateRoomType } from '../components/create-room/types';

export type CreateRoomModalState = {
  spaceId?: string;
  type?: CreateRoomType;
};

export const createRoomModalAtom = atom<CreateRoomModalState | undefined>(undefined);
