import {
  ObservableValue,
  PendingObservableValue,
  PendingObservableResult,
  ComputedObservableValue,
  Observable,
} from 'neurone/lib/utils/observable';
import { useMemo, useSyncExternalStore, useCallback, useEffect } from 'react';

export function useObservable<T>(observable: Observable<T>, listener: (value: T) => void) {
  useEffect(() => {
    const unsub = observable.subscribe(listener);
    return unsub;
  });
}

export function useObservableValue<T>(observableValue: ObservableValue<T>): T {
  const value = useSyncExternalStore(
    useCallback((c) => observableValue.subscribe(c), [observableValue]),
    useCallback(() => observableValue.read, [observableValue])
  );

  return value;
}

export function useScopedObservableValue<T, R>(
  observableValue: ObservableValue<T>,
  scope: (value: T) => R
): R {
  const value = useSyncExternalStore(
    useCallback((c) => observableValue.subscribe(c), [observableValue]),
    useCallback(() => scope(observableValue.read), [observableValue, scope])
  );

  return value;
}

export function useObservableValueOptionally<T>(
  observableValue?: ObservableValue<T>
): T | undefined {
  const value = useSyncExternalStore(
    useCallback(
      (c) => {
        const unsubscribe = observableValue?.subscribe(c);
        return () => {
          unsubscribe?.();
        };
      },
      [observableValue]
    ),
    useCallback(() => observableValue?.read, [observableValue])
  );

  return value;
}

export function useObservableValueListener<T>(
  observableValue: ObservableValue<T>,
  listener: (value: T) => void
): void {
  useEffect(() => {
    const unsub = observableValue.subscribe(listener);
    return unsub;
  }, [observableValue, listener]);
}

export function useObservableDispose<T>(observableValue: ObservableValue<T>) {
  useEffect(() => () => observableValue.dispose(), [observableValue]);
}

export function useComputedObservable<T>(observable: ComputedObservableValue<T>): T {
  const value = useObservableValue(observable);
  useObservableDispose(observable);

  return value;
}

export const useObservableValuePromise = <T>(
  observableValuePromise: Promise<ObservableValue<T>>
): PendingObservableResult<T> => {
  const observable: ObservableValue<PendingObservableResult<T>> = useMemo(
    () => new PendingObservableValue(observableValuePromise),
    [observableValuePromise]
  );

  const value = useObservableValue(observable);

  useObservableDispose(observable);

  return value;
};

export const useComputedPendingObservableResult = <T, U>(
  result: PendingObservableResult<T>,
  compute: (value: T) => U
): PendingObservableResult<U> => {
  const computedResult: PendingObservableResult<U> = useMemo(() => {
    const { value, error, pending } = result;
    if (pending) return { pending: true };
    if (error) return { error };
    return { value: compute(value) };
  }, [result, compute]);

  return computedResult;
};
