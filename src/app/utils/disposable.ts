export type DisposeCallback<DisposeArgs extends unknown[] = [], DisposeReturn = void> = (
  ...args: DisposeArgs
) => DisposeReturn;
export type DisposableContext<
  DisposableArgs extends unknown[] = [],
  DisposeArgs extends unknown[] = [],
  DisposeReturn = void
> = (...args: DisposableArgs) => DisposeCallback<DisposeArgs, DisposeReturn>;

export const disposable = <
  DisposableArgs extends unknown[],
  DisposeArgs extends unknown[] = [],
  DisposeReturn = void
>(
  context: DisposableContext<DisposableArgs, DisposeArgs, DisposeReturn>
) => context;
