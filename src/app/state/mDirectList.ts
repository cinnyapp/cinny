import { atom } from 'jotai';
import { ClientEvent, MatrixEvent } from 'matrix-js-sdk';
import { mx } from '../../client/mx';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { getAccountData, getMDirects } from '../utils/room';

export const mDirectAtom = atom(new Set<string>());
mDirectAtom.onMount = (setAtom) => {
  const mDirectEvent = getAccountData(mx(), AccountDataEvent.Direct);
  if (mDirectEvent) setAtom(getMDirects(mDirectEvent));

  const handleAccountData = (event: MatrixEvent) => {
    setAtom(getMDirects(event));
  };

  mx().on(ClientEvent.AccountData, handleAccountData);
  return () => {
    mx().removeListener(ClientEvent.AccountData, handleAccountData);
  };
};
