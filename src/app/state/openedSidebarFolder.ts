import { WritableAtom, atom } from 'jotai';
import produce from 'immer';
import { atomWithLocalStorage } from './utils/atomWithLocalStorage';
import { getLocalStorageItem, setLocalStorageItem } from '../../client/localStorage';

const OPENED_SIDEBAR_FOLDER = 'openedSidebarFolder';

type OpenedSidebarFolderAction =
  | {
      type: 'PUT';
      id: string;
    }
  | {
      type: 'DELETE';
      id: string;
    };

export type OpenedSidebarFolderAtom = WritableAtom<
  Set<string>,
  [OpenedSidebarFolderAction],
  undefined
>;

const getStoreKey = (userId: string) => `${OPENED_SIDEBAR_FOLDER}${userId}`;

export const makeOpenedSidebarFolderAtom = (userId: string): OpenedSidebarFolderAtom => {
  const storeKey = getStoreKey(userId);

  const baseOpenedSidebarFolderAtom = atomWithLocalStorage<Set<string>>(
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

  const openedSidebarFolderAtom = atom<Set<string>, [OpenedSidebarFolderAction], undefined>(
    (get) => get(baseOpenedSidebarFolderAtom),
    (get, set, action) => {
      if (action.type === 'DELETE') {
        set(
          baseOpenedSidebarFolderAtom,
          produce(get(baseOpenedSidebarFolderAtom), (draft) => {
            draft.delete(action.id);
          })
        );
        return;
      }
      if (action.type === 'PUT') {
        set(
          baseOpenedSidebarFolderAtom,
          produce(get(baseOpenedSidebarFolderAtom), (draft) => {
            draft.add(action.id);
          })
        );
      }
    }
  );

  return openedSidebarFolderAtom;
};

export const clearOpenedSidebarFolderStore = (userId: string) => {
  localStorage.removeItem(getStoreKey(userId));
};
