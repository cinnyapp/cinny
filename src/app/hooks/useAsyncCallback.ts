import { useCallback, useState } from 'react';
import { useAlive } from './useAlive';

export enum AsyncStatus {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export type AsyncIdle = {
  status: AsyncStatus.Idle;
};

export type AsyncLoading = {
  status: AsyncStatus.Loading;
};

export type AsyncSuccess<D> = {
  status: AsyncStatus.Success;
  data: D;
};

export type AsyncError<E = unknown> = {
  status: AsyncStatus.Error;
  error: E;
};

export type AsyncState<D, E = unknown> = AsyncIdle | AsyncLoading | AsyncSuccess<D> | AsyncError<E>;

export type AsyncCallback<TArgs extends unknown[], TData> = (...args: TArgs) => Promise<TData>;

export const useAsyncCallback = <TData, TError, TArgs extends unknown[]>(
  asyncCallback: AsyncCallback<TArgs, TData>
): [AsyncState<TData, TError>, AsyncCallback<TArgs, TData>] => {
  const [state, setState] = useState<AsyncState<TData, TError>>({
    status: AsyncStatus.Idle,
  });
  const alive = useAlive();

  const callback: AsyncCallback<TArgs, TData> = useCallback(
    async (...args) => {
      setState({
        status: AsyncStatus.Loading,
      });

      try {
        const data = await asyncCallback(...args);
        if (alive()) {
          setState({
            status: AsyncStatus.Success,
            data,
          });
        }
        return data;
      } catch (e) {
        if (alive()) {
          setState({
            status: AsyncStatus.Error,
            error: e as TError,
          });
        }
        throw e;
      }
    },
    [asyncCallback, alive]
  );

  return [state, callback];
};
