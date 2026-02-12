import { atom, WritableAtom } from 'jotai';
import produce from 'immer';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const ROOM_TO_ACTIVE_THREAD = 'roomToActiveThread';

const getStoreKey = (userId: string): string => `${ROOM_TO_ACTIVE_THREAD}${userId}`;

type RoomToActiveThread = Map<string, string>;

type RoomToActiveThreadAction =
  | {
      type: 'PUT';
      roomId: string;
      threadId: string;
    }
  | {
      type: 'DELETE';
      roomId: string;
    };

export type RoomToActiveThreadAtom = WritableAtom<
  RoomToActiveThread,
  [RoomToActiveThreadAction],
  undefined
>;

export const makeRoomToActiveThreadAtom = (userId: string): RoomToActiveThreadAtom => {
  const storeKey = getStoreKey(userId);

  const baseRoomToActiveThread = atomWithLocalStorage<RoomToActiveThread>(
    storeKey,
    (key) => {
      const obj: Record<string, string> = getLocalStorageItem(key, {});
      return new Map(Object.entries(obj));
    },
    (key, value) => {
      const obj: Record<string, string> = Object.fromEntries(value);
      setLocalStorageItem(key, obj);
    }
  );

  const navToActivePathAtom = atom<RoomToActiveThread, [RoomToActiveThreadAction], undefined>(
    (get) => get(baseRoomToActiveThread),
    (get, set, action) => {
      if (action.type === 'DELETE') {
        set(
          baseRoomToActiveThread,
          produce(get(baseRoomToActiveThread), (draft) => {
            draft.delete(action.roomId);
          })
        );
        return;
      }
      if (action.type === 'PUT') {
        set(
          baseRoomToActiveThread,
          produce(get(baseRoomToActiveThread), (draft) => {
            draft.set(action.roomId, action.threadId);
          })
        );
      }
    }
  );

  return navToActivePathAtom;
};

export const clearRoomToActiveThreadStore = (userId: string) => {
  localStorage.removeItem(getStoreKey(userId));
};
