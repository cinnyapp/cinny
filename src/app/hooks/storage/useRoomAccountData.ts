import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { useMemo } from 'react';
import { JoinAccountDataObject } from '../../../client/storage/collections';
import { useClient } from '../useClient';
import { useObservableValuePromise } from '../useObservableValue';

export const useRoomAccountData = (
  roomId: string
): PendingObservableResult<JoinAccountDataObject[]> => {
  const ct = useClient();

  const eventsPromise = useMemo(
    () => ct.storage.joinAccountData.observableRead.queryIndex('roomId', roomId),
    [ct, roomId]
  );

  const eventsResult = useObservableValuePromise(eventsPromise);

  return eventsResult;
};
