import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { createRoomModalAtom, CreateRoomModalState } from '../createRoomModal';
import { CreateRoomType } from '../../components/create-room/types';

export const useCreateRoomModalState = (): CreateRoomModalState | undefined => {
  const data = useAtomValue(createRoomModalAtom);

  return data;
};

type CloseCallback = () => void;
export const useCloseCreateRoomModal = (): CloseCallback => {
  const setSettings = useSetAtom(createRoomModalAtom);

  const close: CloseCallback = useCallback(() => {
    setSettings(undefined);
  }, [setSettings]);

  return close;
};

type OpenCallback = (space?: string, type?: CreateRoomType) => void;
export const useOpenCreateRoomModal = (): OpenCallback => {
  const setSettings = useSetAtom(createRoomModalAtom);

  const open: OpenCallback = useCallback(
    (spaceId, type) => {
      setSettings({ spaceId, type });
    },
    [setSettings]
  );

  return open;
};
