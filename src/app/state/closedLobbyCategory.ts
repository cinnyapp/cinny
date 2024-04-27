import { atom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const CLOSED_LOBBY_CATEGORY = 'closedLobbyCategories';

const baseClosedLobbyCategoriesAtom = atomWithLocalStorage<Set<string>>(
  CLOSED_LOBBY_CATEGORY,
  (key) => {
    const arrayValue = getLocalStorageItem<string[]>(key, []);
    return new Set(arrayValue);
  },
  (key, value) => {
    const arrayValue = Array.from(value);
    setLocalStorageItem(key, arrayValue);
  }
);

type ClosedLobbyCategoriesAction =
  | {
      type: 'PUT';
      categoryId: string;
    }
  | {
      type: 'DELETE';
      categoryId: string;
    };

export const closedLobbyCategoriesAtom = atom<
  Set<string>,
  [ClosedLobbyCategoriesAction],
  undefined
>(
  (get) => get(baseClosedLobbyCategoriesAtom),
  (get, set, action) => {
    if (action.type === 'DELETE') {
      set(
        baseClosedLobbyCategoriesAtom,
        produce(get(baseClosedLobbyCategoriesAtom), (draft) => {
          draft.delete(action.categoryId);
        })
      );
      return;
    }
    if (action.type === 'PUT') {
      set(
        baseClosedLobbyCategoriesAtom,
        produce(get(baseClosedLobbyCategoriesAtom), (draft) => {
          draft.add(action.categoryId);
        })
      );
    }
  }
);

export const makeLobbyCategoryId = (...args: string[]): string => args.join('|');
