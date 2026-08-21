import { deleteDB } from 'idb';
import { Machine, OutgoingRequestSender } from 'neurone/lib/crypto/machine';
import { MatrixRequest } from 'neurone/lib/matrix-request';
import { MatrixRequestRetrier, sleep } from 'neurone/lib/utils';
import { FALLBACK_SYNC_STORE_NAME_FULL, getSessionStoreName, Session } from './sessions';

// the matrix-crypto-sdk add postfix to storeName
const getCryptoDBName = (storeName: string): string => `${storeName}::matrix-sdk-crypto`;

let closeMachineRef: (() => void) | undefined;

export const initializeCrypto = async (
  session: Session,
  request: MatrixRequest
): Promise<{
  machine: Machine;
  deleteCryptoStorage: () => Promise<void>;
  closeMachine: () => void;
}> => {
  const storeName = getSessionStoreName(session).crypto;

  const { olmMachine, closeMachine: closeMachineInner } = await Machine.init(
    session.userId,
    session.deviceId,
    storeName
  );

  const closeMachine = () => {
    closeMachineInner();
    closeMachineRef = undefined;
  };

  closeMachineRef = closeMachine;

  const outgoingSenderAbortCont = new AbortController();
  const outgoingRequestRetrier = new MatrixRequestRetrier(sleep);
  const outgoingSender = new OutgoingRequestSender(request, outgoingSenderAbortCont.signal);

  const machine = new Machine(olmMachine, outgoingSender, outgoingRequestRetrier);

  const deleteCryptoStorage = async () => {
    closeMachine();
    await deleteDB(getCryptoDBName(storeName));
  };

  return { machine, deleteCryptoStorage, closeMachine };
};

export const deleteClientCryptoStorage = async (session: Session): Promise<void> => {
  closeMachineRef?.();
  await deleteDB(getSessionStoreName(session).crypto);

  if (session.fallbackSdkStores) {
    try {
      // migration code from matrix-js-sdk
      await deleteDB(FALLBACK_SYNC_STORE_NAME_FULL);
    } catch (e) {
      console.log(e);
    }
  }
};
