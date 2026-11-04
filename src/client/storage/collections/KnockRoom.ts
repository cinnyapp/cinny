/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { IDBPDatabase } from 'idb';
import { Collection, Entry } from 'neurone/lib/storage/collection';
import { StrippedStateEvent } from 'neurone/lib/api/types';
import { StorageDriver } from 'neurone/lib/storage';
import { encodeKey } from '../utils';

const ROOM_STATE_STORE_NAME = 'KnockRoomState';

export const getKnockRoomStateId = (roomId: string, type: string, stateKey: string): string =>
  encodeKey(roomId, type, stateKey);

export const prepareKnockRoomStateStore = (idb: IDBPDatabase, oldVersion: number) => {
  if (oldVersion < 1) {
    const store = idb.createObjectStore(ROOM_STATE_STORE_NAME, {
      keyPath: 'id',
    });

    store.createIndex('roomId', 'roomId', { unique: false });
    store.createIndex('type', 'type', { unique: false });
  }
};

export type KnockRoomStateObject = Entry<
  'id',
  'roomId' | 'type',
  {
    id: string;
    roomId: string;
    type: string;
    event: StrippedStateEvent;
  }
>;

export type KnockRoomStateCollection = Collection<'id', 'roomId' | 'type', KnockRoomStateObject>;

export const createKnockRoomStateCollection = (driver: StorageDriver): KnockRoomStateCollection =>
  new Collection(ROOM_STATE_STORE_NAME, 'id', driver);
