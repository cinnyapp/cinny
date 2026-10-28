import { useCallback, useEffect, useState } from 'react';
import { atom, useSetAtom } from 'jotai';
import { MatrixEvent, MatrixEventEvent, Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { WordSwap, fetchWordSwaps, swappedWords } from './wordSwap';

// One fetch per page load; a failed one is retried next time a composer mounts.
let loading: Promise<WordSwap[]> | undefined;

export const useWordSwaps = (): WordSwap[] => {
  const mx = useMatrixClient();
  const [swaps, setSwaps] = useState<WordSwap[]>([]);

  useEffect(() => {
    let alive = true;
    loading ??= fetchWordSwaps(() => mx.getAccessToken()).catch(() => {
      loading = undefined;
      return [];
    });
    loading.then((list) => alive && setSwaps(list));
    return () => {
      alive = false;
    };
  }, [mx]);

  return swaps;
};

export type WordSwapBurst = { id: number; word: string };

export const wordSwapBurstAtom = atom<WordSwapBurst | undefined>(undefined);

let nextBurst = 0;

export const useWordSwapBurst = () => {
  const setBurst = useSetAtom(wordSwapBurstAtom);
  return useCallback(
    (word: string) => {
      nextBurst += 1;
      setBurst({ id: nextBurst, word });
    },
    [setBurst]
  );
};

// Plays the effect when someone else's swapped message arrives in the room you're looking at.
export const useWordSwapArrive = (room: Room) => {
  const mx = useMatrixClient();
  const burst = useWordSwapBurst();

  useEffect(() => {
    const check = (mEvent: MatrixEvent) => {
      if (mEvent.getSender() === mx.getUserId()) return;
      const [word] = swappedWords(mEvent.getContent());
      if (word) burst(word);
    };
    const handleTimeline: RoomEventHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      eventRoom,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (eventRoom?.roomId !== room.roomId || !data.liveEvent) return;
      if (mEvent.isEncrypted() && !mEvent.getClearContent()) {
        mEvent.once(MatrixEventEvent.Decrypted, () => check(mEvent));
      } else {
        check(mEvent);
      }
    };
    room.on(RoomEvent.Timeline, handleTimeline);
    return () => {
      room.removeListener(RoomEvent.Timeline, handleTimeline);
    };
  }, [mx, room, burst]);
};
