import { atom } from 'jotai';
import { CreateRoomType } from '../components/create-room/types';

export type CreateRoomModalState = {
  spaceId?: string;
  type?: CreateRoomType;
};

export const createRoomModalAtom = atom<CreateRoomModalState | undefined>(undefined);
