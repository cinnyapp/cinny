// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { atom } from 'jotai';
import { CreateRoomType } from '../components/create-room/types';

export type CreateRoomModalState = {
  spaceId?: string;
  type?: CreateRoomType;
};

export const createRoomModalAtom = atom<CreateRoomModalState | undefined>(undefined);
