import { IDBPDatabase } from 'idb';
import { Presence, StatusContent } from 'neurone/lib/api/types';
import { StorageDriver } from 'neurone/lib/storage';
import { Collection, Entry } from 'neurone/lib/storage/collection';

const PRESENCE_STORE_NAME = 'Presence';

export const preparePresenceStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(PRESENCE_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('presence', 'presence', { unique: false });
  }
};

export type PresenceObject = Entry<
  'id',
  'presence',
  {
    id: string;
    presence: Presence;
    content: StatusContent;
  }
>;

export type PresenceCollection = Collection<'id', 'presence', PresenceObject>;

export const createPresenceCollection = (driver: StorageDriver): PresenceCollection =>
  new Collection(PRESENCE_STORE_NAME, 'id', driver);
