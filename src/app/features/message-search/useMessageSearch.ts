import { useCallback } from 'react';
import {
  ClientEvent,
  SearchEventContext,
  SearchEventOrder,
  SearchResult,
} from 'neurone/lib/api/types';
import { postSearch, PostSearchBody, PostSearchOK } from 'neurone/lib/api/matrix/client/v3/search';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useClient } from '../../hooks/useClient';

export type ResultItem = {
  rank: number;
  event: ClientEvent;
  context: SearchEventContext;
};

export type ResultGroup = {
  roomId: string;
  items: ResultItem[];
};

export type MessageSearchResult = {
  nextToken?: string;
  highlights: string[];
  groups: ResultGroup[];
};

const groupSearchResult = (results: SearchResult[]): ResultGroup[] => {
  const groups: ResultGroup[] = [];

  results.forEach((item) => {
    const { rank, result, context } = item;
    if (!result || typeof rank !== 'number' || !context) return;

    const roomId = result.room_id;
    const resultItem: ResultItem = {
      rank,
      event: result,
      context,
    };

    const lastAddedGroup: ResultGroup | undefined = groups[groups.length - 1];
    if (lastAddedGroup && roomId === lastAddedGroup.roomId) {
      lastAddedGroup.items.push(resultItem);
      return;
    }
    groups.push({
      roomId,
      items: [resultItem],
    });
  });

  return groups;
};

const parseSearchResult = (result: PostSearchOK): MessageSearchResult => {
  const roomEvents = result.search_categories.room_events;

  const searchResult: MessageSearchResult = {
    nextToken: roomEvents?.next_batch,
    highlights: roomEvents?.highlights ?? [],
    groups: groupSearchResult(roomEvents?.results ?? []),
  };

  return searchResult;
};

export type MessageSearchParams = {
  term?: string;
  order?: SearchEventOrder;
  rooms?: string[];
  senders?: string[];
};
export const useMessageSearch = (params: MessageSearchParams) => {
  const ct = useClient();
  const { term, order, rooms, senders } = params;

  const searchMessages = useCallback(
    async (nextBatch?: string) => {
      if (!term)
        return {
          highlights: [],
          groups: [],
        };
      const limit = 20;

      const requestBody: PostSearchBody = {
        search_categories: {
          room_events: {
            event_context: {
              before_limit: 0,
              after_limit: 0,
              include_profile: false,
            },
            filter: {
              limit,
              rooms,
              senders,
            },
            include_state: false,
            order_by: order,
            search_term: term,
          },
        },
      };

      const resp = await ct.requestAuthJSON(
        postSearch({
          searchParams: { next_batch: nextBatch === '' ? undefined : nextBatch },
          body: requestBody,
        })
      );

      const [err, result] = await parseMatrixResp<PostSearchOK>(resp);

      if (err) {
        throw new Error(err.data.error ?? err.data.errcode);
      }

      return parseSearchResult(result);
    },
    [ct, term, order, rooms, senders]
  );

  return searchMessages;
};
