import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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

  // Tracks the request number.
  // If two or more requests are made subsequently
  // we will throw all old request's response after they resolved.
  const reqNumberRef = useRef(0);

  const callback: AsyncCallback<TArgs, TData> = useCallback(
    async (...args) => {
      queueMicrotask(() => {
        // Warning: flushSync was called from inside a lifecycle method.
        // React cannot flush when React is already rendering.
        // Consider moving this call to a scheduler task or micro task.
        flushSync(() => {
          // flushSync because
          // https://github.com/facebook/react/issues/26713#issuecomment-1872085134
          setState({
            status: AsyncStatus.Loading,
          });
        });
      });

      reqNumberRef.current += 1;

      const currentReqNumber = reqNumberRef.current;
      try {
        const data = await asyncCallback(...args);
        if (currentReqNumber !== reqNumberRef.current) {
          throw new Error('AsyncCallbackHook: Request replaced!');
        }
        if (alive()) {
          queueMicrotask(() => {
            setState({
              status: AsyncStatus.Success,
              data,
            });
          });
        }
        return data;
      } catch (e) {
        if (currentReqNumber !== reqNumberRef.current) {
          throw new Error('AsyncCallbackHook: Request replaced!');
        }

        if (alive()) {
          queueMicrotask(() => {
            setState({
              status: AsyncStatus.Error,
              error: e as TError,
            });
          });
        }
        throw e;
      }
    },
    [asyncCallback, alive]
  );

  return [state, callback];
};
