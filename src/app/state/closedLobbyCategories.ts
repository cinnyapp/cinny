import { WritableAtom, atom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const CLOSED_LOBBY_CATEGORY = 'closedLobbyCategories';

type ClosedLobbyCategoriesAction =
  | {
      type: 'PUT';
      categoryId: string;
    }
  | {
      type: 'DELETE';
      categoryId: string;
    };

export type ClosedLobbyCategoriesAtom = WritableAtom<
  Set<string>,
  [ClosedLobbyCategoriesAction],
  undefined
>;

export const makeClosedLobbyCategoriesAtom = (userId: string): ClosedLobbyCategoriesAtom => {
  const storeKey = `${CLOSED_LOBBY_CATEGORY}${userId}`;

  const baseClosedLobbyCategoriesAtom = atomWithLocalStorage<Set<string>>(
    storeKey,
    (key) => {
      const arrayValue = getLocalStorageItem<string[]>(key, []);
      return new Set(arrayValue);
    },
    (key, value) => {
      const arrayValue = Array.from(value);
      setLocalStorageItem(key, arrayValue);
    }
  );

  const closedLobbyCategoriesAtom = atom<Set<string>, [ClosedLobbyCategoriesAction], undefined>(
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

  return closedLobbyCategoriesAtom;
};

export const makeLobbyCategoryId = (...args: string[]): string => args.join('|');
