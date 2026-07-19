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
      roomIds: string[];
    }
  | {
      type: 'DELETE';
      roomIds: string[];
    };

export const spaceRoomsAtom = atom<Set<string>, [SpaceRoomsAction], void>(
  (get) => get(baseSpaceRoomsAtom),
  (get, set, action) => {
    const current = get(baseSpaceRoomsAtom);
    const { type, roomIds } = action;

    if (type === 'DELETE' && roomIds.find((roomId) => current.has(roomId))) {
      set(
        baseSpaceRoomsAtom,
        produce(current, (draft) => {
          roomIds.forEach((roomId) => draft.delete(roomId));
        })
      );
      return;
    }
    if (type === 'PUT') {
      const newEntries = roomIds.filter((roomId) => !current.has(roomId));
      if (newEntries.length > 0)
        set(
          baseSpaceRoomsAtom,
          produce(current, (draft) => {
            newEntries.forEach((roomId) => draft.add(roomId));
          })
        );
    }
  }
);
