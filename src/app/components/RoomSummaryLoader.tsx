import { ReactNode, useCallback } from 'react';
import { MatrixClient, Room } from 'matrix-js-sdk';
import { useQuery } from '@tanstack/react-query';
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { LocalRoomSummary, useLocalRoomSummary } from '../hooks/useLocalRoomSummary';

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
  children: (summary?: IHierarchyRoom) => ReactNode;
}) {
  const mx = useMatrixClient();

  const fetchSummary = useCallback(() => mx.getRoomHierarchy(roomId, 1, 1), [mx, roomId]);

  const { data } = useQuery({
    queryKey: [roomId, `hierarchy`],
    queryFn: fetchSummary,
  });

  const summary = data?.rooms[0] ?? undefined;

  return children(summary);
}
