/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { useClient } from './useClient';
import { useObservableValuePromise } from './useObservableValue';
import { ThreadId } from '../../types/matrix/room';

export const useEventReciepts = (eventId: string, threadId?: string) => {
  const ct = useClient();

  const receiptsResult = useObservableValuePromise(
    useMemo(() => {
      if (!eventId) return Promise.resolve(new ObservableValue(undefined, ''));
      return ct.storage.readReceipt.observableRead.queryIndex('eventId', eventId);
    }, [ct, eventId])
  );

  const receipts = useMemo(() => {
    const rs = receiptsResult.value;
    if (!rs) return [];
    return rs?.filter((r) => r.threadId === (threadId ?? ThreadId.Main));
  }, [receiptsResult, threadId]);

  return receipts;
};
