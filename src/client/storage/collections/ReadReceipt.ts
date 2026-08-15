import { IDBPDatabase, IDBPTransaction } from 'idb';
import { StorageDriver } from 'neurone/lib/storage';
import { Collection, Entry } from 'neurone/lib/storage/collection';
import { ReceiptType } from 'neurone/lib/api/types';
import { encodeKey } from '../utils';
import { ThreadId } from '../../../types/matrix/room';

const READ_RECEIPT_STORE_NAME = 'ReadReceipt';

export const getReadReceiptId = (
  roomId: string,
  userId: string,
  threadId: string | ThreadId
): string => encodeKey(roomId, userId, threadId);

export const prepareReadReceiptStore = (
  idb: IDBPDatabase,
  oldVersion: number,
  transaction: IDBPTransaction<any, any, 'versionchange'>
) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(READ_RECEIPT_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('eventId', 'eventId', { unique: false });
  }

  if (oldVersion < 2) {
    const store = transaction.objectStore(READ_RECEIPT_STORE_NAME);

    store.createIndex('userId', 'userId', { unique: false });
  }
};

export type ReadReceiptObject = Entry<
  'id',
  'userId' | 'eventId' | 'roomId',
  {
    id: string;
    roomId: string;
    userId: string;
    type: ReceiptType;
    eventId: string;
    ts: number;
    threadId: string | ThreadId;
  }
>;

export type ReadReceiptCollection = Collection<
  'id',
  'eventId' | 'roomId' | 'userId',
  ReadReceiptObject
>;

export const createReadReceiptCollection = (driver: StorageDriver): ReadReceiptCollection =>
  new Collection(READ_RECEIPT_STORE_NAME, 'id', driver);
