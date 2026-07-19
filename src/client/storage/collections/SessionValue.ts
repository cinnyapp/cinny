import { IDBPDatabase } from 'idb';
import { StorageDriver } from 'neurone/lib/storage';
import { Collection, Entry } from 'neurone/lib/storage/collection';

const SESSION_VALUE_STORE_NAME = 'SessionValue';

export const prepareSessionValueStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    idb.createObjectStore(SESSION_VALUE_STORE_NAME, {
      keyPath: 'id',
    });
  }
};

export type SessionValueObject = Entry<
  'id',
  never,
  {
    id: string;
    value: unknown;
  }
>;

export type SessionValueCollection = Collection<'id', never, SessionValueObject>;

export const createSessionValueCollection = (driver: StorageDriver): SessionValueCollection =>
  new Collection(SESSION_VALUE_STORE_NAME, 'id', driver);

/**
 * utils for better read/write for unknown values
 */

export type ValueParser<T> = (obj?: SessionValueObject) => T | undefined;

export type ValueUtil<T> = {
  id: string;
  parse: ValueParser<T>;
};

export type SessionValueUtils = {
  syncToken: ValueUtil<string>;
  pendingMemberRooms: ValueUtil<string[]>;
};

export const sessionValue: SessionValueUtils = {
  syncToken: {
    id: 'syncToken',
    parse: (obj) => {
      if (obj && typeof obj.value === 'string') {
        return obj.value;
      }

      return undefined;
    },
  },
  pendingMemberRooms: {
    id: 'pendingMemberRooms',
    parse: (obj?: SessionValueObject) => {
      if (obj && Array.isArray(obj.value)) {
        return obj.value.filter((i) => typeof i === 'string');
      }
      return undefined;
    },
  },
} as const;
