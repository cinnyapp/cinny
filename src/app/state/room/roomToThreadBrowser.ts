import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

const createThreadBrowserAtom = () => atom<boolean>(false);
export type TThreadBrowserAtom = ReturnType<typeof createThreadBrowserAtom>;

/**
 * Tracks whether the thread browser panel is open per room.
 * Key: roomId
 */
export const roomIdToThreadBrowserAtomFamily = atomFamily<string, TThreadBrowserAtom>(() =>
  createThreadBrowserAtom()
);
