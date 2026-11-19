import { useInfiniteQuery } from '@tanstack/react-query';
import { getMessages, GetMessagesOK } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useClient } from './useClient';
import { getActivityFilter } from '../../client/filter';

export const useActivityMessages = (roomId: string, types?: string[], senders?: string[]) => {
  const ct = useClient();

  const query = useInfiniteQuery({
    queryKey: ['activity', roomId, types, senders],

    initialPageParam: undefined as string | undefined,

    queryFn: async ({ pageParam }) => {
      const resp = await ct.requestAuthJSON(
        getMessages({
          pathParams: { roomId },
          searchParams: {
            from: pageParam,
            limit: 40,
            dir: 'b',
            filter: JSON.stringify(getActivityFilter(types, senders)),
          },
        })
      );

      const [err, result] = await parseMatrixResp<GetMessagesOK>(resp);

      if (err) {
        throw new Error(err.data.error ?? err.data.errcode);
      }

      return result;
    },

    getNextPageParam: (lastPage) => {
      // Replace `next_batch` with the actual pagination token
      // returned by your Matrix threads API.
      const nextPageToken = lastPage.end;
      return nextPageToken ?? undefined;
    },

    enabled: !!roomId,
  });

  return {
    ...query,
    events: query.data?.pages.flatMap((page) => page.chunk ?? []) ?? [],
    loadMore: query.fetchNextPage,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
  };
};
