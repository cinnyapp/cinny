import { IDBPDatabase } from 'idb';
import { Collection, Entry } from 'neurone/lib/storage/collection';
import { StrippedStateEvent } from 'neurone/lib/api/types';
import { StorageDriver } from 'neurone/lib/storage';
import { encodeKey } from '../utils';

const ROOM_STATE_STORE_NAME = 'InviteRoomState';

export const getInviteRoomStateId = (roomId: string, type: string, stateKey: string): string =>
  encodeKey(roomId, type, stateKey);

export const prepareInviteRoomStateStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(ROOM_STATE_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
  }
};

export type InviteRoomStateObject = Entry<
  'id',
  'roomId' | 'type',
  {
    id: string;
    roomId: string;
    type: string;
    event: StrippedStateEvent;
  }
>;

export type InviteRoomStateCollection = Collection<'id', 'roomId' | 'type', InviteRoomStateObject>;

export const createInviteRoomStateCollection = (driver: StorageDriver): InviteRoomStateCollection =>
  new Collection(ROOM_STATE_STORE_NAME, 'id', driver);
