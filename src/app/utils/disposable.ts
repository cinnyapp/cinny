export type DisposeCallback<Q extends unknown[] = [], R = void> = (...args: Q) => R;
export type DisposableContext<P extends unknown[] = [], Q extends unknown[] = [], R = void> = (
  ...args: P
) => DisposeCallback<Q, R>;

export const disposable = <P extends unknown[], Q extends unknown[] = [], R = void>(
  context: DisposableContext<P, Q, R>
) => context;
