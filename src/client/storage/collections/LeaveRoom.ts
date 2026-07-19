import { IDBPDatabase } from 'idb';
import { Collection, Entry } from 'neurone/lib/storage/collection';
import { AccountDataEvent, StateEventWithoutRoomId } from 'neurone/lib/api/types';
import { StorageDriver } from 'neurone/lib/storage';
import { encodeKey } from '../utils';

/**
 * LeaveAccountData Store
 */
const ACCOUNT_DATA_STORE_NAME = 'LeaveAccountData';

export const getLeaveAccountDataId = (roomId: string, type: string): string =>
  encodeKey(roomId, type);

export const prepareLeaveAccountDataStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(ACCOUNT_DATA_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
  }
};

export type LeaveAccountDataObject = Entry<
  'id',
  'roomId' | 'type',
  {
    id: string;
    roomId: string;
    type: string;
    event: AccountDataEvent;
  }
>;

export type LeaveAccountDataCollection = Collection<
  'id',
  'roomId' | 'type',
  LeaveAccountDataObject
>;

export const createLeaveAccountDataCollection = (
  driver: StorageDriver
): LeaveAccountDataCollection => new Collection(ACCOUNT_DATA_STORE_NAME, 'id', driver);

/**
 * LeaveRoomState Store
 */
const ROOM_STATE_STORE_NAME = 'LeaveRoomState';

export const getLeaveRoomStateId = (roomId: string, type: string, stateKey: string): string =>
  encodeKey(roomId, type, stateKey);

export const prepareLeaveRoomStateStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(ROOM_STATE_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
  }
};

export type LeaveRoomStateObject = Entry<
  'id',
  'roomId' | 'type',
  {
    id: string;
    roomId: string;
    type: string;
    event: StateEventWithoutRoomId;
  }
>;

export type LeaveRoomStateCollection = Collection<'id', 'roomId' | 'type', LeaveRoomStateObject>;

export const createLeaveRoomStateCollection = (driver: StorageDriver): LeaveRoomStateCollection =>
  new Collection(ROOM_STATE_STORE_NAME, 'id', driver);
