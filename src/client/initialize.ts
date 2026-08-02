import { MatrixRequest } from 'neurone/lib/matrix-request';
import { Disposer } from 'neurone/lib/utils/disposable';
import { Session } from '../app/state/sessions';
import {
  ClientContext,
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

export const initializeClient = async (session: Session): Promise<ClientContext> => {
  const disposer = new Disposer();

  const { storage, deleteStorage } = await createStorage(session.userId);

  const requestAuthJSON: MatrixRequest = getAuthJSONRequest(session.baseUrl, session.accessToken);

  const { machine, deleteCryptoStorage } = await initializeCrypto(session, requestAuthJSON);
  await machine.outgoingRequests.processAll();

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

  const syncTokenObservable = await createSyncTokenObservable(storage, disposer);
  const pendingMemberRooms = await createPendingMemberRoomObservable(storage, disposer);

  const { verificationRequest, onVerificationRequest } = createVerificationRequestObservable();

  const getTxnId: GetTxnId = getTxnIdFunc();

  const [syncObservable, sync] = createSync(requestAuthJSON);
  const [syncController, onWriteComplete, onSyncToken] = createSyncController(
    syncObservable,
    sync,
    () => syncTokenObservable.read
  );

  const decryption = new DecryptionManager(machine);

  const roomToTimeline = createTimelines(rooms.join, syncObservable, requestAuthJSON, disposer);

  const logoutObservable = createLogoutObservable(syncObservable, disposer);
  const logoutManager = new LogoutManager(logoutObservable, requestAuthJSON, async () => {
    disposer.run();
    await deleteCryptoStorage();
    await deleteStorage();
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
    roomToCreators,
    roomToVersion,
    roomToTimeline,

    pendingMemberRooms,
    verificationRequest,
    sync: {
      observable: syncObservable,
      controller: syncController,
    },
    requestAuthJSON,
    getTxnId,
    logout: () => logoutManager.logout(),
    clearCacheAndReload,
  };

  const machineManager = new MachineManager(ct);

  const syncResponseManager = new SyncResponseManager(ct, syncTokenObservable, {
    onWriteComplete,
    onSyncToken,
    onVerificationRequest,
  });

  disposer.collect(
    decryption,
    syncObservable,
    syncController,
    roomToTimeline,
    logoutObservable,
    logoutManager,
    machineManager,
    verificationRequest,
    syncResponseManager
  );

  return ct;
};
