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

export const getRoomStateEventsQuery = (roomId: string, eventType: string) =>
  new QueryRange(
    getJoinRoomStateId(roomId, eventType, ''),
    getJoinRoomStateId(roomId, eventType, MAX_UNICODE)
  );

export const useRoomStateEvents = (
  roomId: string,
  eventType: string
): PendingObservableResult<JoinRoomStateObject[]> => {
  const ct = useClient();
  const stateEventPromise = useMemo(
    () => ct.storage.joinRoomState.observableRead.query(getRoomStateEventsQuery(roomId, eventType)),
    [ct, roomId, eventType]
  );

  const stateEventResult = useObservableValuePromise(stateEventPromise);

  return stateEventResult;
};

export const useRoomState = (roomId: string): PendingObservableResult<JoinRoomStateObject[]> => {
  const ct = useClient();
  const eventsPromise = useMemo(
    () => ct.storage.joinRoomState.observableRead.queryIndex('roomId', roomId),
    [ct, roomId]
  );

  const eventsResult = useObservableValuePromise(eventsPromise);

  return eventsResult;
};
