import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

const createOpenThreadAtom = () => atom<string | undefined>(undefined);
export type TOpenThreadAtom = ReturnType<typeof createOpenThreadAtom>;

/**
 * Tracks the currently-open thread root event ID per room.
 * Key: roomId
 * Value: eventId of the thread root, or undefined if no thread is open.
 */
export const roomIdToOpenThreadAtomFamily = atomFamily<string, TOpenThreadAtom>(() =>
  createOpenThreadAtom()
);
