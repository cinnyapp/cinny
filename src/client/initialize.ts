import { MatrixRequest } from 'neurone/lib/matrix-request';
import { Disposer } from 'neurone/lib/utils/disposable';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { removeSession, Session } from './sessions';
import {
  ClientContext,
  createSecretsObservable,
  createDirectRoomsObservable,
  createDirectRoomToUserObservable,
  createEncryptedRoomsObservable,
  createLogoutObservable,
  createPendingMemberRoomObservable,
  createRoomContext,
  createRoomToAliasObservable,
  createRoomToAvatarObservable,
  createRoomToHistoryVisibilityObservable,
  createRoomToJoinRuleObservable,
  createRoomToLatestEventObservable,
  createRoomToNameObservable,
  createRoomToReplacementObservable,
  createRoomToSummaryObservable,
  createRoomToTopicObservable,
  createRoomToTypeObservable,
  createSpaceMapping,
  createStateContext,
  createSyncTokenObservable,
  createVerificationRequestObservable,
  createBackupInfoObservable,
  createUserReceiptObservable,
  createToDeviceEventsObservable,
  createNotificationsObservable,
} from './context';
import { createStorage } from './storage';
import { getAuthJSONRequest } from './request';
import { createSync, createSyncController } from './sync';
import { GetTxnId, getTxnIdFunc } from './txn';
import { createTimelines } from './room';
import { SyncResponseManager } from './SyncResponseManager';
import { LogoutManager } from './LogoutManager';
import { MachineManager } from './MachineManager';
import { DecryptionManager } from './decryption';
import { initializeCrypto } from './crypto';
import { MegolmBackup } from './MegolmBackup';
import { clearUserLocalStorage } from './localStorage';
import { CallSessions } from './call';
import { randomStr } from '../app/utils/common';

export type InitializeClientResult = {
  ct: ClientContext;
  dispose: () => void;
};
export const initializeClient = async (session: Session): Promise<InitializeClientResult> => {
  const disposer = new Disposer();
  const publisherKey = randomStr();

  const { storage, deleteStorage, disconnectStorage } = await createStorage(session);

  const requestAuthJSON: MatrixRequest = getAuthJSONRequest(session.baseUrl, session.accessToken);

  const { machine, deleteCryptoStorage, closeMachine } = await initializeCrypto(
    session,
    requestAuthJSON
  );
  // awaiting on this request can slow down the loading perf if server is busy.
  machine.outgoingRequests.processAll();

  const state = await createStateContext(storage, disposer);

  const { rooms, spaceRooms, roomToCreators, roomToVersion } = await createRoomContext(
    state,
    disposer
  );
  const encryptedRooms = createEncryptedRoomsObservable(state, disposer);
  const directRoomToUser = await createDirectRoomToUserObservable(storage, disposer);
  const directRooms = createDirectRoomsObservable(directRoomToUser, disposer);
  const { roomToParents, roomToChildEvents } = createSpaceMapping(state, disposer);

  const roomToSummary = await createRoomToSummaryObservable(storage, disposer);
  const roomToAlias = createRoomToAliasObservable(state, disposer);
  const roomToName = createRoomToNameObservable(state, disposer);
  const roomToTopic = createRoomToTopicObservable(state, disposer);
  const roomToAvatar = createRoomToAvatarObservable(state, disposer);
  const roomToHistoryVisibility = createRoomToHistoryVisibilityObservable(state, disposer);
  const roomToJoinRule = createRoomToJoinRuleObservable(state, disposer);
  const roomToType = createRoomToTypeObservable(state, disposer);
  const roomToReplacement = createRoomToReplacementObservable(state, disposer);
  const roomToLatestEvent = await createRoomToLatestEventObservable(storage, disposer);
  const userReadReceipt = await createUserReceiptObservable(session, storage, disposer);
  const { notifications, threadNotifications } = await createNotificationsObservable(
    storage,
    disposer
  );

  const syncTokenObservable = await createSyncTokenObservable(storage, disposer);
  const pendingMemberRooms = await createPendingMemberRoomObservable(storage, disposer);

  const { verificationRequest, onVerificationRequest } = createVerificationRequestObservable();
  const { toDeviceEvents, onToDeviceEvents } = createToDeviceEventsObservable();
  const secrets = await createSecretsObservable(storage, disposer);
  const backupInfo = await createBackupInfoObservable(requestAuthJSON, secrets, disposer);
  const megolmBackup = new MegolmBackup(machine, requestAuthJSON, backupInfo);

  const getTxnId: GetTxnId = getTxnIdFunc();

  const [syncObservable, sync] = createSync(requestAuthJSON);
  const [syncController, onWriteComplete, onSyncToken] = createSyncController(
    syncObservable,
    sync,
    () => syncTokenObservable.read
  );
  const firstSync = new ObservableValue(true, publisherKey);

  const decryption = new DecryptionManager(machine);

  const callSessions = new CallSessions(storage, syncObservable);
  const roomToTimeline = createTimelines(rooms.join, syncObservable, requestAuthJSON, disposer);

  const logoutObservable = createLogoutObservable(syncObservable, disposer);
  const logoutManager = new LogoutManager(logoutObservable, requestAuthJSON, async () => {
    disposer.run();
    await deleteCryptoStorage();
    await deleteStorage();
    clearUserLocalStorage(session.userId);
    removeSession(session);
  });

  const clearCacheAndReload = async () => {
    disposer.run();
    await deleteStorage();
    window.location.reload();
  };

  const ct: ClientContext = {
    session,
    storage,
    machine,
    state,
    rooms,
    decryption,

    directRoomToUser,
    directRooms,
    spaceRooms,
    encryptedRooms,

    roomToParents,
    roomToChildEvents,
    roomToSummary,
    roomToAlias,
    roomToName,
    roomToTopic,
    roomToAvatar,
    roomToHistoryVisibility,
    roomToJoinRule,
    roomToType,
    roomToReplacement,
    roomToLatestEvent,
    userReadReceipt,
    notifications,
    threadNotifications,
    roomToCreators,
    roomToVersion,
    roomToTimeline,

    pendingMemberRooms,
    verificationRequest,
    toDeviceEvents,
    callSessions,
    secrets,
    backupInfo,
    megolmBackup,
    sync: {
      observable: syncObservable,
      controller: syncController,
    },
    firstSync,
    requestAuthJSON,
    getTxnId,
    logout: () => logoutManager.logout(),
    clearCacheAndReload,
  };

  const machineManager = new MachineManager(ct);

  const syncResponseManager = new SyncResponseManager(ct, syncTokenObservable, {
    onWriteComplete: () => {
      if (firstSync.read) firstSync.publish(publisherKey, false);
      onWriteComplete();
    },
    onSyncToken,
    onVerificationRequest,
    onToDeviceEvents,
  });

  disposer.collect(
    disconnectStorage,
    closeMachine,
    megolmBackup,
    decryption,
    syncObservable,
    syncController,
    roomToTimeline,
    logoutObservable,
    logoutManager,
    machineManager,
    verificationRequest,
    toDeviceEvents,
    callSessions,
    syncResponseManager
  );

  return {
    ct,
    dispose: () => disposer.run(),
  };
};
