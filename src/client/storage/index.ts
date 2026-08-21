import { deleteDB, openDB, unwrap } from 'idb';
import { IndexedDBStorageDriver } from 'neurone/lib/storage/driver';
import {
  AccountDataCollection,
  createAccountDataCollection,
  prepareAccountDataStore,
  createJoinAccountDataCollection,
  createJoinRoomMemberCollection,
  createJoinRoomStateCollection,
  createJoinRoomSummaryCollection,
  createUnreadNotificationsCollection,
  createUnreadThreadNotificationsCollection,
  JoinAccountDataCollection,
  JoinRoomMemberCollection,
  JoinRoomStateCollection,
  JoinRoomSummaryCollection,
  UnreadNotificationsCollection,
  UnreadThreadNotificationsCollection,
  prepareJoinAccountDataStore,
  prepareJoinRoomMemberStore,
  prepareJoinRoomStateStore,
  prepareJoinRoomSummaryStore,
  prepareUnreadNotificationsStore,
  prepareUnreadThreadNotificationsStore,
  ReadReceiptCollection,
  prepareReadReceiptStore,
  createReadReceiptCollection,
  InviteRoomStateCollection,
  prepareInviteRoomStateStore,
  createInviteRoomStateCollection,
  KnockRoomStateCollection,
  prepareKnockRoomStateStore,
  createKnockRoomStateCollection,
  LeaveAccountDataCollection,
  LeaveRoomStateCollection,
  prepareLeaveAccountDataStore,
  prepareLeaveRoomStateStore,
  createLeaveAccountDataCollection,
  createLeaveRoomStateCollection,
  PresenceCollection,
  preparePresenceStore,
  createPresenceCollection,
  SessionValueCollection,
  prepareSessionValueStore,
  createSessionValueCollection,
  JoinRoomLatestCollection,
  createJoinRoomLatestEventCollection,
  prepareJoinRoomLatestEventStore,
} from './collections';
import { getSessionStoreName, Session } from '../sessions';

export * from './utils';

const DATABASE_VERSION = 2;

export interface Storage {
  sessionValue: SessionValueCollection;

  accountData: AccountDataCollection;

  joinAccountData: JoinAccountDataCollection;
  joinRoomSummary: JoinRoomSummaryCollection;
  joinRoomState: JoinRoomStateCollection;
  joinRoomMember: JoinRoomMemberCollection;
  joinRoomLatestEvent: JoinRoomLatestCollection;

  unreadNotifications: UnreadNotificationsCollection;
  unreadThreadNotifications: UnreadThreadNotificationsCollection;

  readReceipt: ReadReceiptCollection;

  inviteRoomState: InviteRoomStateCollection;

  knockRoomState: KnockRoomStateCollection;

  leaveAccountData: LeaveAccountDataCollection;
  leaveRoomState: LeaveRoomStateCollection;

  presence: PresenceCollection;
}

// create a reference to opened database close callback.
// used in clearing cache if client failed to initilize.
let disconnectStorageRef: (() => void) | undefined;

export const createStorage = async (
  session: Session
): Promise<{
  storage: Storage;
  deleteStorage: () => Promise<void>;
  disconnectStorage: () => void;
}> => {
  const dbName = getSessionStoreName(session).client;

  // TODO: handle all openDB callbacks.
  const idb = await openDB(dbName, DATABASE_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      prepareSessionValueStore(db, oldVersion);

      prepareAccountDataStore(db, oldVersion);

      prepareJoinAccountDataStore(db, oldVersion);
      prepareJoinRoomSummaryStore(db, oldVersion);
      prepareJoinRoomStateStore(db, oldVersion);
      prepareJoinRoomMemberStore(db, oldVersion);
      prepareJoinRoomLatestEventStore(db, oldVersion);

      prepareUnreadNotificationsStore(db, oldVersion);
      prepareUnreadThreadNotificationsStore(db, oldVersion);

      prepareReadReceiptStore(db, oldVersion, transaction);

      prepareInviteRoomStateStore(db, oldVersion);

      prepareKnockRoomStateStore(db, oldVersion);

      prepareLeaveAccountDataStore(db, oldVersion);
      prepareLeaveRoomStateStore(db, oldVersion);

      preparePresenceStore(db, oldVersion);
    },
  });

  const disconnectStorage = () => {
    idb.close();
    disconnectStorageRef = undefined;
  };

  disconnectStorageRef = disconnectStorage;

  const driver = new IndexedDBStorageDriver(unwrap(idb));

  const storage: Storage = {
    sessionValue: createSessionValueCollection(driver),

    accountData: createAccountDataCollection(driver),

    joinAccountData: createJoinAccountDataCollection(driver),
    joinRoomSummary: createJoinRoomSummaryCollection(driver),
    joinRoomState: createJoinRoomStateCollection(driver),
    joinRoomMember: createJoinRoomMemberCollection(driver),
    joinRoomLatestEvent: createJoinRoomLatestEventCollection(driver),

    unreadNotifications: createUnreadNotificationsCollection(driver),
    unreadThreadNotifications: createUnreadThreadNotificationsCollection(driver),

    readReceipt: createReadReceiptCollection(driver),

    inviteRoomState: createInviteRoomStateCollection(driver),

    knockRoomState: createKnockRoomStateCollection(driver),

    leaveAccountData: createLeaveAccountDataCollection(driver),
    leaveRoomState: createLeaveRoomStateCollection(driver),

    presence: createPresenceCollection(driver),
  };

  const deleteStorage = async () => {
    await deleteDB(dbName);
  };

  return { storage, deleteStorage, disconnectStorage };
};

export const deleteClientStorage = async (session: Session) => {
  disconnectStorageRef?.();
  const dbName = getSessionStoreName(session).client;
  await deleteDB(dbName);
};
