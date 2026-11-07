import { useInfiniteQuery } from '@tanstack/react-query';

import { getThreads, GetThreadsOK } from 'neurone/lib/api/matrix/client/v1/rooms';

import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useClient } from './useClient';

export const useRoomThreads = (roomId: string, onlyMy?: boolean, limit = 80) => {
  const ct = useClient();

  const query = useInfiniteQuery({
    queryKey: ['threads', roomId, onlyMy, limit],

    initialPageParam: undefined as string | undefined,

    queryFn: async ({ pageParam }) => {
      const resp = await ct.requestAuthJSON(
        getThreads({
          pathParams: { roomId },
          searchParams: {
            from: pageParam,
            include: onlyMy ? 'participated' : 'all',
            limit,
          },
        })
      );

      const [err, result] = await parseMatrixResp<GetThreadsOK>(resp);

      if (err) {
        throw new Error(err.data.error ?? err.data.errcode);
      }

      return result;
    },

    getNextPageParam: (lastPage) => {
      // Replace `next_batch` with the actual pagination token
      // returned by your Matrix threads API.
      const nextPageToken = lastPage.next_batch;
      return nextPageToken ?? undefined;
    },

    enabled: !!roomId,
  });

  return {
    ...query,

    threads: query.data?.pages.flatMap((page) => page.chunk ?? []) ?? [],

    loadMore: query.fetchNextPage,

    hasMore: query.hasNextPage,

    isLoadingMore: query.isFetchingNextPage,
  };
};
