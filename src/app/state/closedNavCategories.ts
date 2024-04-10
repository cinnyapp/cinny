import { atom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const CLOSED_NAV_CATEGORY = 'closedNavCategories';

const baseClosedNavCategories = atomWithLocalStorage<Set<string>>(
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

export const closedNavCategories = atom<Set<string>, [ClosedNavCategoriesAction], undefined>(
  (get) => get(baseClosedNavCategories),
  (get, set, action) => {
    if (action.type === 'DELETE') {
      set(
        baseClosedNavCategories,
        produce(get(baseClosedNavCategories), (draft) => {
          draft.delete(action.categoryId);
        })
      );
      return;
    }
    if (action.type === 'PUT') {
      set(
        baseClosedNavCategories,
        produce(get(baseClosedNavCategories), (draft) => {
          draft.add(action.categoryId);
        })
      );
    }
  }
);

export const makeNavCategoryId = (...args: string[]): string => args.join('|');
