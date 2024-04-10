import { atom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const CLOSED_NAV_CATEGORY = 'closedNavCategories';

const baseClosedNavCategoriesAtom = atomWithLocalStorage<Set<string>>(
  CLOSED_NAV_CATEGORY,
  (key) => {
    const arrayValue = getLocalStorageItem<string[]>(key, []);
    return new Set(arrayValue);
  },
  (key, value) => {
    const arrayValue = Array.from(value);
    setLocalStorageItem(key, arrayValue);
  }
);

type ClosedNavCategoriesAction =
  | {
      type: 'PUT';
      categoryId: string;
    }
  | {
      type: 'DELETE';
      categoryId: string;
    };

export const closedNavCategoriesAtom = atom<Set<string>, [ClosedNavCategoriesAction], undefined>(
  (get) => get(baseClosedNavCategoriesAtom),
  (get, set, action) => {
    if (action.type === 'DELETE') {
      set(
        baseClosedNavCategoriesAtom,
        produce(get(baseClosedNavCategoriesAtom), (draft) => {
          draft.delete(action.categoryId);
        })
      );
      return;
    }
    if (action.type === 'PUT') {
      set(
        baseClosedNavCategoriesAtom,
        produce(get(baseClosedNavCategoriesAtom), (draft) => {
          draft.add(action.categoryId);
        })
      );
    }
  }
);

export const makeNavCategoryId = (...args: string[]): string => args.join('|');
