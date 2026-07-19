import { StorageDriver } from 'neurone/lib/storage';
import { Collection, Entry } from 'neurone/lib/storage/collection';
import { AccountDataEvent } from 'neurone/lib/api/types';
import { IDBPDatabase } from 'idb';

const ACCOUNT_DATA_STORE_NAME = 'AccountData';

export const prepareAccountDataStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    idb.createObjectStore(ACCOUNT_DATA_STORE_NAME, {
      keyPath: 'id',
    });
  }
};

export type AccountDataObject = Entry<
  'id',
  never,
  {
    id: string;
    event: AccountDataEvent;
  }
>;

export type AccountDataCollection = Collection<'id', never, AccountDataObject>;

export const createAccountDataCollection = (driver: StorageDriver): AccountDataCollection =>
  new Collection(ACCOUNT_DATA_STORE_NAME, 'id', driver);
