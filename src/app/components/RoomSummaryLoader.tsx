import { ReactElement, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { getRoomSummary, GetRoomSummaryOK } from 'neurone/lib/api/matrix/client/v1/roomSummary';
import { getHierarchy, GetHierarchyOK } from 'neurone/lib/api/matrix/client/v1/rooms';
import { SpaceHierarchyRoomChunk } from 'neurone/lib/api/types';
import { AsyncState, AsyncStatus } from '../hooks/useAsyncCallback';
import { useClient } from '../hooks/useClient';
import { useSpecVersionSupport } from '../hooks/useSpecVersions';
import { LocalRoomSummary, useLocalRoomSummary } from '../hooks/useLocalRoomSummary';

type RoomSummaryLoaderProps = {
  roomIdOrAlias: string;
  children: (roomSummary?: GetRoomSummaryOK) => ReactElement;
};

export function RoomSummaryLoader({ roomIdOrAlias, children }: RoomSummaryLoaderProps) {
  const ct = useClient();
  const roomSummarySupported = useSpecVersionSupport('v1.15');

  const fetchSummary = useCallback(async (): Promise<GetRoomSummaryOK> => {
    const endpoint = getRoomSummary({ pathParams: { roomIdOrAlias } });
    if (!roomSummarySupported) {
      endpoint.path = `/_matrix/client/unstable/im.nheko.summary/summary/${encodeURIComponent(
        roomIdOrAlias
      )}`;
    }
    const response = await ct.requestAuthJSON(endpoint);
    const [err, result] = await parseMatrixResp<GetRoomSummaryOK>(response);
    if (err) {
      throw new Error(printMatrixError(err));
    }
    return result;
  }, [ct, roomIdOrAlias, roomSummarySupported]);

  const { data } = useQuery({
    queryKey: [roomIdOrAlias, `summary`],
    queryFn: fetchSummary,
  });

  return children(data);
}

export function LocalRoomSummaryLoader({
  roomId,
  children,
}: {
  roomId: string;
  children: (summary: LocalRoomSummary) => ReactElement;
}) {
  const summary = useLocalRoomSummary(roomId);

  return children(summary);
}
export function HierarchyRoomSummaryLoader({
  roomId,
  children,
}: {
  roomId: string;
  children: (state: AsyncState<SpaceHierarchyRoomChunk, Error>) => ReactElement;
}) {
  const ct = useClient();

  const fetchSummary = useCallback(async (): Promise<GetHierarchyOK> => {
    const response = await ct.requestAuthJSON(
      getHierarchy({
        pathParams: { roomId },
        searchParams: {
          limit: 1,
          max_depth: 1,
        },
      })
    );

    const [err, result] = await parseMatrixResp<GetHierarchyOK>(response);
    if (err) {
      throw new Error(printMatrixError(err));
    }
    return result;
  }, [ct, roomId]);
  const [errorMemo, setError] = useState<Error>();

  const { data, error } = useQuery({
    queryKey: [roomId, `hierarchy`],
    queryFn: fetchSummary,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => {
      setError(err);
      if (failureCount > 3) return false;
      return true;
    },
  });

  let state: AsyncState<SpaceHierarchyRoomChunk, Error> = {
    status: AsyncStatus.Loading,
  };
  if (error) {
    state = {
      status: AsyncStatus.Error,
      error,
    };
  }
  if (errorMemo) {
    state = {
      status: AsyncStatus.Error,
      error: errorMemo,
    };
  }

  const summary = data?.rooms[0];
  if (summary) {
    state = {
      status: AsyncStatus.Success,
      data: summary,
    };
  }

  return children(state);
}
