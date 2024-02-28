import { ReactNode, useCallback, useEffect } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useMatrixClient } from '../hooks/useMatrixClient';

export type IRoomSummary = Awaited<ReturnType<MatrixClient['getRoomSummary']>>;

type RoomSummaryLoaderProps = {
  roomIdOrAlias: string;
  children: (roomSummary?: IRoomSummary) => ReactNode;
};

export function RoomSummaryLoader({ roomIdOrAlias, children }: RoomSummaryLoaderProps) {
  const mx = useMatrixClient();

  const [summaryState, load] = useAsyncCallback(
    useCallback(() => mx.getRoomSummary(roomIdOrAlias), [mx, roomIdOrAlias])
  );

  useEffect(() => {
    load();
  }, [load]);

  const roomSummary = summaryState.status === AsyncStatus.Success ? summaryState.data : undefined;

  return children(roomSummary);
}
