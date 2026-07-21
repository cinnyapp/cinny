import { useCallback } from 'react';
import { withSearchParams } from 'neurone/lib/api/utils';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { ClientContext } from '../../client/context';
import { AsyncState, useAsyncCallbackValue } from './useAsyncCallback';
import { useUnstableFeatureSupport, useSpecVersions } from './useSpecVersions';
import { useClient } from './useClient';

export const useUnstableMutualRoomsSupport = (): boolean => {
  const checkSupport = useUnstableFeatureSupport();

  const supported = checkSupport('uk.half-shot.msc2666.query_mutual_rooms');

  return !!supported;
};

export const useMutualRoomsSupport = (): boolean => {
  const { unstable_features: unstableFeatures, versions } = useSpecVersions();

  const supported =
    versions.includes('v1.19') ||
    unstableFeatures?.['uk.half-shot.msc2666.query_mutual_rooms.stable'];

  return !!supported;
};

type MutualRoomsOK = {
  joined: string[];
  next_batch?: string;
  count: number;
};

const fetchAllMutualRooms = async (
  ct: ClientContext,
  userId: string,
  unstable?: boolean
): Promise<string[]> => {
  const mutualRooms: Set<string> = new Set();

  let nextBatch: string | undefined;
  do {
    // eslint-disable-next-line no-await-in-loop
    const resp = await ct.requestAuthJSON({
      method: 'GET',
      path: withSearchParams(
        unstable
          ? '/_matrix/client/unstable/uk.half-shot.msc2666/user/mutual_rooms'
          : '/_matrix/client/v1/mutual_rooms',
        {
          user_id: userId,
          from: nextBatch,
        }
      ),
      requireAuthentication: true,
    });
    // eslint-disable-next-line no-await-in-loop
    const [err, result] = await parseMatrixResp<MutualRoomsOK>(resp);
    if (err) throw new Error(printMatrixError(err));

    result.joined.forEach((r) => mutualRooms.add(r));
    nextBatch = result.next_batch;
  } while (typeof nextBatch === 'string');

  return Array.from(mutualRooms);
};

export const useMutualRooms = (userId: string): AsyncState<string[], unknown> => {
  const ct = useClient();

  const unstableSupport = useUnstableMutualRoomsSupport();
  const support = useMutualRoomsSupport();

  const [mutualRoomsState] = useAsyncCallbackValue(
    useCallback(async () => {
      if (support) return fetchAllMutualRooms(ct, userId);
      if (unstableSupport) return fetchAllMutualRooms(ct, userId, true);

      const memberships = await ct.storage.joinRoomMember.read.queryIndex('userId', userId);
      return memberships.map((membership) => membership.roomId);
    }, [ct, userId, unstableSupport, support])
  );

  return mutualRoomsState;
};
