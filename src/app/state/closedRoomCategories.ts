import { atom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const CLOSED_ROOM_CATEGORY = 'closedRoomCategories';

const baseClosedRoomCategories = atomWithLocalStorage<Set<string>>(
  CLOSED_ROOM_CATEGORY,
  (key) => {
    const arrayValue = getLocalStorageItem<string[]>(key, []);
    return new Set(arrayValue);
  },
  (key, value) => {
    const arrayValue = Array.from(value);
    setLocalStorageItem(key, arrayValue);
  }
);

type ClosedRoomCategoriesAction =
  | {
      type: 'PUT';
      categoryId: string;
    }
  | {
      type: 'DELETE';
      categoryId: string;
    };

export const closedRoomCategories = atom<Set<string>, [ClosedRoomCategoriesAction], undefined>(
  (get) => get(baseClosedRoomCategories),
  (get, set, action) => {
    if (action.type === 'DELETE') {
      set(
        baseClosedRoomCategories,
        produce(get(baseClosedRoomCategories), (draft) => {
          draft.delete(action.categoryId);
        })
      );
      return;
    }
    if (action.type === 'PUT') {
      set(
        baseClosedRoomCategories,
        produce(get(baseClosedRoomCategories), (draft) => {
          draft.add(action.categoryId);
        })
      );
    }
  }
);

export const makeRoomCategoryId = (...args: string[]): string => args.join('|');
