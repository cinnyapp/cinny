import { Machine, OutgoingRequestSender } from 'neurone/lib/crypto/machine';
import { MatrixRequestRetrier, sleep } from 'neurone/lib/utils';
import { MatrixRequest } from 'neurone/lib/matrix-request';
import { Disposer } from 'neurone/lib/utils/disposable';
import { deleteDB } from 'idb';
import { Session } from '../app/state/sessions';
import {
  ClientContext,
  createDirectRoomsObservable,
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
  createRoomToTypeObservable,
  createSpaceMapping,
  createStateContext,
  createSyncTokenObservable,
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

const initializeCrypto = async (
  session: Session,
  request: MatrixRequest
): Promise<{
  machine: Machine;
  deleteCryptoStorage: () => Promise<void>;
}> => {
  const storeName = `crypto${session.userId}`;

  const { olmMachine, closeMachine } = await Machine.init(
    session.userId,
    session.deviceId,
    storeName
  );

  const outgoingSenderAbortCont = new AbortController();
  const outgoingRequestRetrier = new MatrixRequestRetrier(sleep);
  const outgoingSender = new OutgoingRequestSender(request, outgoingSenderAbortCont.signal);

  const machine = new Machine(olmMachine, outgoingSender, outgoingRequestRetrier);

  const deleteCryptoStorage = async () => {
    closeMachine();

    // the matrix-crypto-sdk add postfix to storeName
    const realStoreName = `${storeName}::matrix-sdk-crypto`;
    await deleteDB(realStoreName);
  };

  return { machine, deleteCryptoStorage };
};

export const initializeClient = async (session: Session): Promise<ClientContext> => {
  const disposer = new Disposer();

  const { storage, deleteStorage } = await createStorage('client', session.userId);

  const requestAuthJSON: MatrixRequest = getAuthJSONRequest(session.baseUrl, session.accessToken);

  const { machine, deleteCryptoStorage } = await initializeCrypto(session, requestAuthJSON);
  await machine.outgoingRequests.processAll();

  const state = await createStateContext(storage, disposer);

  const { rooms, spaceRooms, roomToCreators, roomToVersion } = await createRoomContext(
    state,
    disposer
  );
  const encryptedRooms = createEncryptedRoomsObservable(state, disposer);
  const directRooms = await createDirectRoomsObservable(storage, disposer);
  const { roomToParents, roomToChildEvents } = createSpaceMapping(state, disposer);

  const roomToSummary = await createRoomToSummaryObservable(storage, disposer);
  const roomToAlias = createRoomToAliasObservable(state, disposer);
  const roomToName = createRoomToNameObservable(state, disposer);
  const roomToAvatar = createRoomToAvatarObservable(state, disposer);
  const roomToHistoryVisibility = createRoomToHistoryVisibilityObservable(state, disposer);
  const roomToJoinRule = createRoomToJoinRuleObservable(state, disposer);
  const roomToType = createRoomToTypeObservable(state, disposer);
  const roomToReplacement = createRoomToReplacementObservable(state, disposer);
  const roomToLatestEvent = await createRoomToLatestEventObservable(storage, disposer);

  const syncTokenObservable = await createSyncTokenObservable(storage, disposer);
  const pendingMemberRooms = await createPendingMemberRoomObservable(storage, disposer);

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

  const ct: ClientContext = {
    session,
    storage,
    machine,
    state,
    rooms,
    decryption,

    directRooms,
    spaceRooms,
    encryptedRooms,

    roomToParents,
    roomToChildEvents,
    roomToSummary,
    roomToAlias,
    roomToName,
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
    sync: {
      observable: syncObservable,
      controller: syncController,
    },
    requestAuthJSON,
    getTxnId,
    logout: () => logoutManager.logout(),
  };

  const machineManager = new MachineManager(ct);

  const syncResponseManager = new SyncResponseManager(
    ct,
    syncTokenObservable,
    onWriteComplete,
    onSyncToken
  );

  disposer.collect(
    decryption,
    syncObservable,
    syncController,
    roomToTimeline,
    logoutObservable,
    logoutManager,
    machineManager,
    syncResponseManager
  );

  return ct;
};
