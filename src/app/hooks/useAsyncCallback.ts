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

export type AsyncSuccess<T> = {
  status: AsyncStatus.Success;
  data: T;
};

export type AsyncError = {
  status: AsyncStatus.Error;
  error: unknown;
};

export type AsyncState<T> = AsyncIdle | AsyncLoading | AsyncSuccess<T> | AsyncError;

export type AsyncCallback<TArgs extends unknown[], TData> = (...args: TArgs) => Promise<TData>;

export const useAsyncCallback = <TArgs extends unknown[], TData>(
  asyncCallback: AsyncCallback<TArgs, TData>
): [AsyncState<TData>, AsyncCallback<TArgs, TData>] => {
  const [state, setState] = useState<AsyncState<TData>>({
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
            error: e,
          });
        }
        throw e;
      }
    },
    [asyncCallback, alive]
  );

  return [state, callback];
};
