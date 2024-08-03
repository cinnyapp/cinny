import { ReactNode, useCallback, useState } from 'react';
import { MatrixClient, Room } from 'matrix-js-sdk';
import { useQuery } from '@tanstack/react-query';
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { LocalRoomSummary, useLocalRoomSummary } from '../hooks/useLocalRoomSummary';
import { AsyncState, AsyncStatus } from '../hooks/useAsyncCallback';

export type IRoomSummary = Awaited<ReturnType<MatrixClient['getRoomSummary']>>;

type RoomSummaryLoaderProps = {
  roomIdOrAlias: string;
  children: (roomSummary?: IRoomSummary) => ReactNode;
};

export function RoomSummaryLoader({ roomIdOrAlias, children }: RoomSummaryLoaderProps) {
  const mx = useMatrixClient();

  const fetchSummary = useCallback(() => mx.getRoomSummary(roomIdOrAlias), [mx, roomIdOrAlias]);

  const { data } = useQuery({
    queryKey: [roomIdOrAlias, `summary`],
    queryFn: fetchSummary,
  });

  return children(data);
}

export function LocalRoomSummaryLoader({
  room,
  children,
}: {
  room: Room;
  children: (roomSummary: LocalRoomSummary) => ReactNode;
}) {
  const summary = useLocalRoomSummary(room);

  return children(summary);
}

export function HierarchyRoomSummaryLoader({
  roomId,
  children,
}: {
  roomId: string;
  children: (state: AsyncState<IHierarchyRoom, Error>) => ReactNode;
}) {
  const mx = useMatrixClient();

  const fetchSummary = useCallback(() => mx.getRoomHierarchy(roomId, 1, 1), [mx, roomId]);
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

  let state: AsyncState<IHierarchyRoom, Error> = {
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

  const summary = data?.rooms[0] ?? undefined;
  if (summary) {
    state = {
      status: AsyncStatus.Success,
      data: summary,
    };
  }

  return children(state);
}
