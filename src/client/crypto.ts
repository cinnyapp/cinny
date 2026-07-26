import { deleteDB } from 'idb';
import { Machine, OutgoingRequestSender } from 'neurone/lib/crypto/machine';
import { MatrixRequest } from 'neurone/lib/matrix-request';
import { MatrixRequestRetrier, sleep } from 'neurone/lib/utils';
import { Session } from '../app/state/sessions';

const getCryptoStoreName = (userId: string): string => `crypto${userId}`;

// the matrix-crypto-sdk add postfix to storeName
const getCryptoDBName = (userId: string): string =>
  `${getCryptoStoreName(userId)}::matrix-sdk-crypto`;

let closeMachineRef: (() => void) | undefined;

export const initializeCrypto = async (
  session: Session,
  request: MatrixRequest
): Promise<{
  machine: Machine;
  deleteCryptoStorage: () => Promise<void>;
  closeMachine: () => void;
}> => {
  const storeName = getCryptoStoreName(session.userId);

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
    await deleteDB(getCryptoDBName(session.userId));
  };

  return { machine, deleteCryptoStorage, closeMachine };
};

export const deleteClientCryptoStorage = async (userId: string): Promise<void> => {
  closeMachineRef?.();
  await deleteDB(getCryptoDBName(userId));
};
