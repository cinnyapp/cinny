import { createContext, useCallback, useContext } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { RoomToActiveThreadAtom } from '../roomToActiveThread';

const RoomToActiveThreadAtomContext = createContext<RoomToActiveThreadAtom | null>(null);
export const RoomToActiveThreadProvider = RoomToActiveThreadAtomContext.Provider;

export const useRoomToActiveThreadAtom = (): RoomToActiveThreadAtom => {
  const anAtom = useContext(RoomToActiveThreadAtomContext);

  if (!anAtom) {
    throw new Error('RoomToActiveThreadAtom is not provided!');
  }

  return anAtom;
};

export const useThreadSelector = (roomId: string): ((threadId: string) => void) => {
  const roomToActiveThreadAtom = useRoomToActiveThreadAtom();
  const setRoomToActiveThread = useSetAtom(roomToActiveThreadAtom);

  const onThreadSelect = useCallback(
    (threadId: string) => {
      setRoomToActiveThread({
        type: 'PUT',
        roomId,
        threadId,
      });
    },
    [roomId, setRoomToActiveThread]
  );

  return onThreadSelect;
};

export const useActiveThread = (roomId: string): string | undefined => {
  const roomToActiveThreadAtom = useRoomToActiveThreadAtom();
  const roomToActiveThread = useAtomValue(roomToActiveThreadAtom);

  return roomToActiveThread.get(roomId);
};

export const useThreadClose = (roomId: string): (() => void) => {
  const roomToActiveThreadAtom = useRoomToActiveThreadAtom();
  const setRoomToActiveThread = useSetAtom(roomToActiveThreadAtom);

  const closeThread = useCallback(() => {
    setRoomToActiveThread({
      type: 'DELETE',
      roomId,
    });
  }, [roomId, setRoomToActiveThread]);

  return closeThread;
};
