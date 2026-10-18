import { IDBPDatabase } from 'idb';
import {
  AccountDataEvent,
  MessageEventWithoutRoomId,
  RoomSummary,
  StateEventWithoutRoomId,
} from 'neurone/lib/api/types';
import { StorageDriver } from 'neurone/lib/storage';
import { Collection, Entry } from 'neurone/lib/storage/collection';
import { encodeKey } from '../utils';

/**
 * JoinAccountData Store
 */
const ACCOUNT_DATA_STORE_NAME = 'JoinAccountData';

export const getJoinAccountDataId = (roomId: string, type: string): string =>
  encodeKey(roomId, type);

export const prepareJoinAccountDataStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(ACCOUNT_DATA_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
  }
};

export type JoinAccountDataObject = Entry<
  'id',
  'roomId' | 'type',
  {
    id: string;
    roomId: string;
    type: string;
    event: AccountDataEvent;
  }
>;

export type JoinAccountDataCollection = Collection<'id', 'roomId' | 'type', JoinAccountDataObject>;

export const createJoinAccountDataCollection = (driver: StorageDriver): JoinAccountDataCollection =>
  new Collection(ACCOUNT_DATA_STORE_NAME, 'id', driver);

/**
 * JoinRoomSummary Store
 */
const ROOM_SUMMARY_STORE_NAME = 'JoinRoomSummary';

export const equalRoomSummary = (s1: RoomSummary, s2: RoomSummary): boolean =>
  s1['m.invited_member_count'] === s2['m.invited_member_count'] &&
  s1['m.joined_member_count'] === s2['m.joined_member_count'] &&
  s1['m.heroes']?.length === s2['m.heroes']?.length &&
  (s1['m.heroes']?.every((userId, index) => userId === s2['m.heroes']?.[index]) ?? true);

export const prepareJoinRoomSummaryStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    idb.createObjectStore(ROOM_SUMMARY_STORE_NAME, {
      keyPath: 'id',
    });
  }
};

export type JoinRoomSummaryObject = Entry<
  'id',
  never,
  {
    id: string;
    summary: RoomSummary;
  }
>;
export type JoinRoomSummaryCollection = Collection<'id', never, JoinRoomSummaryObject>;

export const createJoinRoomSummaryCollection = (driver: StorageDriver): JoinRoomSummaryCollection =>
  new Collection(ROOM_SUMMARY_STORE_NAME, 'id', driver);

/**
 * JoinRoomState Store
 */
const ROOM_STATE_STORE_NAME = 'JoinRoomState';

export const getJoinRoomStateId = (roomId: string, type: string, stateKey: string): string =>
  encodeKey(roomId, type, stateKey);

export const prepareJoinRoomStateStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(ROOM_STATE_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
  }
};

export type JoinRoomStateObject = Entry<
  'id',
  'roomId' | 'type',
  {
    id: string;
    roomId: string;
    type: string;
    event: StateEventWithoutRoomId;
  }
>;

export type JoinRoomStateCollection = Collection<'id', 'roomId' | 'type', JoinRoomStateObject>;

export const createJoinRoomStateCollection = (driver: StorageDriver): JoinRoomStateCollection =>
  new Collection(ROOM_STATE_STORE_NAME, 'id', driver);

/**
 * JoinRoomSticky Store
 */
const ROOM_STATE_STICKY_NAME = 'JoinRoomSticky';

export const prepareJoinRoomStickyStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 3) {
    const store = idb.createObjectStore(ROOM_STATE_STICKY_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
    store.createIndex('expiresAt', 'expiresAt', { unique: false });
  }
};

export type JoinRoomStickyObject = Entry<
  'id',
  'roomId' | 'type' | 'expiresAt',
  {
    id: string;
    roomId: string;
    type: string;
    expiresAt: number;
    event: MessageEventWithoutRoomId;
  }
>;

export type JoinRoomStickyCollection = Collection<
  'id',
  'roomId' | 'type' | 'expiresAt',
  JoinRoomStickyObject
>;

export const createJoinRoomStickyCollection = (driver: StorageDriver): JoinRoomStickyCollection =>
  new Collection(ROOM_STATE_STICKY_NAME, 'id', driver);

/**
 * JoinRoomMember Store
 */
const ROOM_MEMBER_STORE_NAME = 'JoinRoomMember';

export const getJoinRoomMemberId = (roomId: string, userId: string): string =>
  encodeKey(roomId, userId);

export const prepareJoinRoomMemberStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(ROOM_MEMBER_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('userId', 'userId', { unique: false });
  }
};

export type JoinRoomMemberObject = Entry<
  'id',
  'roomId' | 'userId',
  {
    id: string;
    roomId: string;
    userId: string;
    event: StateEventWithoutRoomId;
  }
>;

export type JoinRoomMemberCollection = Collection<'id', 'roomId' | 'userId', JoinRoomMemberObject>;

export const createJoinRoomMemberCollection = (driver: StorageDriver): JoinRoomMemberCollection =>
  new Collection(ROOM_MEMBER_STORE_NAME, 'id', driver);

/**
 * JoinRoomLatestEvent Store
 */

const ROOM_LATEST_EVENT_STORE_NAME = 'JoinRoomLatestEvent';

export const prepareJoinRoomLatestEventStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    idb.createObjectStore(ROOM_LATEST_EVENT_STORE_NAME, {
      keyPath: 'id',
    });
  }
};

export type JoinRoomLatestEventObject = Entry<
  'id',
  never,
  {
    id: string;
    event: MessageEventWithoutRoomId;
  }
>;

export type JoinRoomLatestCollection = Collection<'id', never, JoinRoomLatestEventObject>;

export const createJoinRoomLatestEventCollection = (
  driver: StorageDriver
): JoinRoomLatestCollection => new Collection(ROOM_LATEST_EVENT_STORE_NAME, 'id', driver);
