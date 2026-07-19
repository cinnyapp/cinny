import { IDBPDatabase } from 'idb';
import { UnreadNotificationCounts } from 'neurone/lib/api/types';
import { StorageDriver } from 'neurone/lib/storage';
import { Collection, Entry } from 'neurone/lib/storage/collection';
import { encodeKey } from '../utils';

/**
 * UnreadNotifications
 */
const UNREAD_NOTIFICATIONS_STORE_NAME = 'UnreadNotifications';

export const prepareUnreadNotificationsStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    idb.createObjectStore(UNREAD_NOTIFICATIONS_STORE_NAME, {
      keyPath: 'id',
    });
  }
};

export type UnreadNotificationsObject = Entry<
  'id',
  never,
  {
    id: string;
    unread: UnreadNotificationCounts;
  }
>;
export type UnreadNotificationsCollection = Collection<'id', never, UnreadNotificationsObject>;

export const createUnreadNotificationsCollection = (
  driver: StorageDriver
): UnreadNotificationsCollection => new Collection(UNREAD_NOTIFICATIONS_STORE_NAME, 'id', driver);

/**
 * UnreadThreadNotifications
 */
const UNREAD_THREAD_NOTIFICATIONS_STORE_NAME = 'UnreadThreadNotifications';

export const getUnreadThreadNotificationId = (roomId: string, threadId: string): string =>
  encodeKey(roomId, threadId);

export const prepareUnreadThreadNotificationsStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(UNREAD_THREAD_NOTIFICATIONS_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
  }
};

export type UnreadThreadNotificationsObject = Entry<
  'id',
  'roomId',
  {
    id: string;
    roomId: string;
    threadId: string;
    unread: UnreadNotificationCounts;
  }
>;
export type UnreadThreadNotificationsCollection = Collection<
  'id',
  'roomId',
  UnreadThreadNotificationsObject
>;

export const createUnreadThreadNotificationsCollection = (
  driver: StorageDriver
): UnreadThreadNotificationsCollection =>
  new Collection(UNREAD_THREAD_NOTIFICATIONS_STORE_NAME, 'id', driver);
