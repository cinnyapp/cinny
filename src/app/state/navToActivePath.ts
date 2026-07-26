import { WritableAtom, atom } from 'jotai';
import produce from 'immer';
import { Path } from 'react-router-dom';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const NAV_TO_ACTIVE_PATH = 'navToActivePath';

const getStoreKey = (userId: string): string => `${NAV_TO_ACTIVE_PATH}${userId}`;

type NavToActivePath = Map<string, Path>;

type NavToActivePathAction =
  | {
      type: 'PUT';
      navId: string;
      path: Path;
    }
  | {
      type: 'DELETE';
      navId: string;
    };

export type NavToActivePathAtom = WritableAtom<NavToActivePath, [NavToActivePathAction], void>;

export const makeNavToActivePathAtom = (userId: string): NavToActivePathAtom => {
  const storeKey = getStoreKey(userId);

  const baseNavToActivePathAtom = atomWithLocalStorage<NavToActivePath>(
    storeKey,
    (key) => {
      const obj: Record<string, Path> = getLocalStorageItem(key, {});
      return new Map(Object.entries(obj));
    },
    (key, value) => {
      const obj: Record<string, Path> = Object.fromEntries(value);
      setLocalStorageItem(key, obj);
    }
  );

  const navToActivePathAtom = atom<NavToActivePath, [NavToActivePathAction], void>(
    (get) => get(baseNavToActivePathAtom),
    (get, set, action) => {
      if (action.type === 'DELETE') {
        set(
          baseNavToActivePathAtom,
          produce(get(baseNavToActivePathAtom), (draft) => {
            draft.delete(action.navId);
          })
        );
        return;
      }
      if (action.type === 'PUT') {
        set(
          baseNavToActivePathAtom,
          produce(get(baseNavToActivePathAtom), (draft) => {
            draft.set(action.navId, action.path);
          })
        );
      }
    }
  );

  return navToActivePathAtom;
};

export const clearNavToActivePathStore = (userId: string) => {
  localStorage.removeItem(getStoreKey(userId));
};
