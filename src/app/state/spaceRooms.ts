import { atom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const SPACE_ROOMS = 'spaceRooms';

const baseSpaceRoomsAtom = atomWithLocalStorage<Set<string>>(
  SPACE_ROOMS,
  (key) => {
    const arrayValue = getLocalStorageItem<string[]>(key, []);
    return new Set(arrayValue);
  },
  (key, value) => {
    const arrayValue = Array.from(value);
    setLocalStorageItem(key, arrayValue);
  }
);

type SpaceRoomsAction =
  | {
      type: 'PUT';
      roomId: string;
    }
  | {
      type: 'DELETE';
      roomId: string;
    };

export const spaceRoomsAtom = atom<Set<string>, [SpaceRoomsAction], undefined>(
  (get) => get(baseSpaceRoomsAtom),
  (get, set, action) => {
    if (action.type === 'DELETE') {
      set(
        baseSpaceRoomsAtom,
        produce(get(baseSpaceRoomsAtom), (draft) => {
          draft.delete(action.roomId);
        })
      );
      return;
    }
    if (action.type === 'PUT') {
      set(
        baseSpaceRoomsAtom,
        produce(get(baseSpaceRoomsAtom), (draft) => {
          draft.add(action.roomId);
        })
      );
    }
  }
);
