import { useCallback, useMemo } from 'react';
import { AccountDataEvent } from 'neurone/lib/api/types';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { useClient } from '../useClient';
import {
  useComputedPendingObservableResult,
  useObservableValuePromise,
} from '../useObservableValue';

export function useAccountData<T extends AccountDataEvent>(
  eventType: string
): PendingObservableResult<T | undefined> {
  const ct = useClient();
  const observablePromise = useMemo(
    () => ct.storage.accountData.observableRead.get(eventType),
    [ct, eventType]
  );

  const result = useObservableValuePromise(observablePromise);

  return useComputedPendingObservableResult(
    result,
    useCallback((v) => v?.event as T | undefined, [])
  );
}

export function useAccountDataEvents(): PendingObservableResult<AccountDataEvent[]> {
  const ct = useClient();
  const observablePromise = useMemo(() => ct.storage.accountData.observableRead.getAll(), [ct]);

  const result = useObservableValuePromise(observablePromise);

  return useComputedPendingObservableResult(
    result,
    useCallback((objs) => objs.map((o) => o.event), [])
  );
}
