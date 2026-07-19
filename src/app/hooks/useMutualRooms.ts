import { useCallback } from 'react';
import { useMatrixClient } from './useMatrixClient';
import { AsyncState, useAsyncCallbackValue } from './useAsyncCallback';
import { useUnstableFeatureSupport } from './useSpecVersions';

export const useMutualRoomsSupport = (): boolean => {
  const checkSupport = useUnstableFeatureSupport();

  const supported =
    checkSupport('uk.half-shot.msc2666') ||
    checkSupport('uk.half-shot.msc2666.mutual_rooms') ||
    checkSupport('uk.half-shot.msc2666.query_mutual_rooms');

  return !!supported;
};

export const useMutualRooms = (userId: string): AsyncState<string[], unknown> => {
  const mx = useMatrixClient();

  const supported = useMutualRoomsSupport();

  const [mutualRoomsState] = useAsyncCallbackValue(
    useCallback(
      () => (supported ? mx._unstable_getSharedRooms(userId) : Promise.resolve([])),
      [mx, userId, supported]
    )
  );

  return mutualRoomsState;
};
