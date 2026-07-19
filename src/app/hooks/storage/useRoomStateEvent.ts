import { useMemo } from 'react';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { QueryRange } from 'neurone/lib/storage/collection';
import { getJoinRoomStateId, JoinRoomStateObject } from '../../../client/storage/collections';
import { useClient } from '../useClient';
import { useObservableValuePromise } from '../useObservableValue';
import { MAX_UNICODE } from '../../../client/storage';

export const useRoomStateEvent = (
  roomId: string,
  eventType: string,
  stateKey: string
): PendingObservableResult<JoinRoomStateObject | undefined> => {
  const ct = useClient();
  const stateEventPromise = useMemo(
    () =>
      ct.storage.joinRoomState.observableRead.get(getJoinRoomStateId(roomId, eventType, stateKey)),
    [ct, roomId, eventType, stateKey]
  );

  const stateEventResult = useObservableValuePromise(stateEventPromise);

  return stateEventResult;
};

export const useRoomStateEvents = (
  roomId: string,
  eventType: string
): PendingObservableResult<JoinRoomStateObject[]> => {
  const ct = useClient();
  const stateEventPromise = useMemo(
    () =>
      ct.storage.joinRoomState.observableRead.query(
        new QueryRange(
          getJoinRoomStateId(roomId, eventType, ''),
          getJoinRoomStateId(roomId, eventType, MAX_UNICODE)
        )
      ),
    [ct, roomId, eventType]
  );

  const stateEventResult = useObservableValuePromise(stateEventPromise);

  return stateEventResult;
};
