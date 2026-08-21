import { WritableAtom, atom } from 'jotai';
import produce from 'immer';
import { atomWithLocalStorage } from './utils/atomWithLocalStorage';
import { getLocalStorageItem, setLocalStorageItem } from '../../client/localStorage';

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

const getStoreKey = (userId: string) => `${CLOSED_LOBBY_CATEGORY}${userId}`;

export const makeClosedLobbyCategoriesAtom = (userId: string): ClosedLobbyCategoriesAtom => {
  const storeKey = getStoreKey(userId);

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

export const clearClosedLobbyCategoriesStore = (userId: string) => {
  localStorage.removeItem(getStoreKey(userId));
};
