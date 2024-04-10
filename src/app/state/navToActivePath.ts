import { atom } from 'jotai';
import produce from 'immer';
import { Path } from 'react-router-dom';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const NAV_TO_ACTIVE_PATH = 'navToActivePath';

type NavToActivePath = Map<string, Path>;

const baseNavToActivePathAtom = atomWithLocalStorage<NavToActivePath>(
  NAV_TO_ACTIVE_PATH,
  (key) => {
    const obj: Record<string, Path> = getLocalStorageItem(key, {});
    return new Map(Object.entries(obj));
  },
  (key, value) => {
    const obj: Record<string, Path> = Object.fromEntries(value);
    setLocalStorageItem(key, obj);
  }
);

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
export const navToActivePathAtom = atom<NavToActivePath, [NavToActivePathAction], undefined>(
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
