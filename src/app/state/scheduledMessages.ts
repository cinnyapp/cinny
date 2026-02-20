import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

export const delayedEventsSupportedAtom = atom<boolean>(false);

export const roomIdToScheduledTimeAtomFamily = atomFamily<string, ReturnType<typeof atom<Date | null>>>(
  () => atom<Date | null>(null)
);

// Save the delay_id instead of cancelling the message immediately in case
// the edit process is cancelled
export const roomIdToEditingScheduledDelayIdAtomFamily = atomFamily<
  string,
  ReturnType<typeof atom<string | null>>
>(() => atom<string | null>(null));
