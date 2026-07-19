import { useCallback, useMemo } from 'react';
import { ObservableValue, PendingObservableResult } from 'neurone/lib/utils/observable';
import { AccountDataType } from '../../types/matrix/accountData';
import { StateEventType } from '../../types/matrix/room';
import { getGlobalPackRoomToStateKey, ImagePack, ImageUsage } from '../plugins/custom-emoji';
import { useClient } from './useClient';
import {
  useComputedPendingObservableResult,
  useObservableValuePromise,
} from './useObservableValue';
import { getJoinRoomStateId, JoinRoomStateObject } from '../../client/storage/collections';
import { useRoomStateEvent, useRoomStateEvents } from './storage/useRoomStateEvent';

export const useUserImagePack = (): PendingObservableResult<ImagePack | undefined> => {
  const ct = useClient();
  const userPackObjPromise = useMemo(
    () => ct.storage.accountData.observableRead.get(AccountDataType.PoniesUserEmotes),
    [ct]
  );

  const userPackObjResult = useObservableValuePromise(userPackObjPromise);

  return useComputedPendingObservableResult(
    userPackObjResult,
    useCallback(
      (userPackObj) => {
        if (!userPackObj) return undefined;
        return ImagePack.fromAccountData(ct.session.userId, userPackObj.event);
      },
      [ct]
    )
  );
};

export const useGlobalImagePacks = (): PendingObservableResult<ImagePack[]> => {
  const ct = useClient();
  const emoteRoomsObjPromise = useMemo(
    () => ct.storage.accountData.observableRead.get(AccountDataType.PoniesEmoteRooms),
    [ct]
  );
  const emoteRoomsObjResult = useObservableValuePromise(emoteRoomsObjPromise);

  const roomToStateKeysResult = useComputedPendingObservableResult(
    emoteRoomsObjResult,
    useCallback((emoteRoomsObj) => getGlobalPackRoomToStateKey(emoteRoomsObj?.event.content), [])
  );
  const roomToStateKeys = roomToStateKeysResult.value;

  const roomPackEventsPromise = useMemo(() => {
    const keys = roomToStateKeys
      ? Object.keys(roomToStateKeys).flatMap((roomId) =>
          roomToStateKeys[roomId].map((stateKey) =>
            getJoinRoomStateId(roomId, StateEventType.PoniesRoomEmotes, stateKey)
          )
        )
      : [];

    return ct.storage.joinRoomState.observableRead.getMultiple(keys);
  }, [ct, roomToStateKeys]);

  const roomPackEventsResult = useObservableValuePromise(roomPackEventsPromise);

  return useComputedPendingObservableResult(
    roomPackEventsResult,
    useCallback(
      (roomPackEvents) =>
        roomPackEvents
          .filter((p) => !!p)
          .map((packEvent) => ImagePack.fromStateEvent(packEvent.roomId, packEvent.event)),
      []
    )
  );
};

export const useRoomImagePack = (
  roomId: string,
  stateKey: string
): PendingObservableResult<ImagePack | undefined> => {
  const roomPackEventResult = useRoomStateEvent(roomId, StateEventType.PoniesRoomEmotes, stateKey);

  return useComputedPendingObservableResult(
    roomPackEventResult,
    useCallback(
      (roomPackEvent) =>
        roomPackEvent
          ? ImagePack.fromStateEvent(roomPackEvent.roomId, roomPackEvent.event)
          : undefined,
      []
    )
  );
};

export const useRoomImagePacks = (roomId: string): PendingObservableResult<ImagePack[]> => {
  const roomPackEventsResult = useRoomStateEvents(roomId, StateEventType.PoniesRoomEmotes);

  return useComputedPendingObservableResult(
    roomPackEventsResult,
    useCallback(
      (roomPackEvents) =>
        roomPackEvents.map((roomPackEvent) =>
          ImagePack.fromStateEvent(roomPackEvent.roomId, roomPackEvent.event)
        ),
      []
    )
  );
};

export const useRoomsImagePacks = (rooms: string[]): PendingObservableResult<ImagePack[]> => {
  const ct = useClient();
  const idsPromise = useMemo(
    () =>
      ct.storage.joinRoomState.observableRead.queryIndexKeys(
        'type',
        StateEventType.PoniesRoomEmotes
      ),
    [ct]
  );
  const idsResult = useObservableValuePromise(idsPromise);

  const packKeysResult = useComputedPendingObservableResult(
    idsResult,
    useCallback(
      (ids) =>
        ids.filter((id) =>
          rooms.find((roomId) =>
            id.startsWith(getJoinRoomStateId(roomId, StateEventType.PoniesRoomEmotes, ''))
          )
        ),
      [rooms]
    )
  );

  const roomPackEventsResult = useObservableValuePromise(
    useMemo(() => {
      if (!packKeysResult.value) {
        return new Promise<ObservableValue<[JoinRoomStateObject | undefined]>>(
          (resolve, reject) => {
            if (packKeysResult.error) {
              reject(packKeysResult.error);
            }
          }
        );
      }
      return ct.storage.joinRoomState.observableRead.getMultiple(packKeysResult.value);
    }, [ct, packKeysResult])
  );

  return useComputedPendingObservableResult(
    roomPackEventsResult,
    useCallback(
      (roomPackEvents) =>
        roomPackEvents
          .filter((p) => !!p)
          .map((roomPackEvent) =>
            ImagePack.fromStateEvent(roomPackEvent.roomId, roomPackEvent.event)
          ),
      []
    )
  );
};

export const useRelevantImagePacks = (
  usage: ImageUsage,
  rooms: string[]
): [ImagePack[], boolean | undefined, Error | undefined] => {
  const userPackResult = useUserImagePack();
  const globalPacksResult = useGlobalImagePacks();

  const roomsPacksResult = useRoomsImagePacks(rooms);
  const loading: boolean | undefined =
    userPackResult.pending || globalPacksResult.pending || roomsPacksResult.pending;
  const error: Error | undefined =
    userPackResult.error || globalPacksResult.error || roomsPacksResult.error;

  const relevantPacks = useMemo(() => {
    const packs = userPackResult.value ? [userPackResult.value] : [];
    const globalPackIds = new Set(globalPacksResult.value?.map((pack) => pack.id));

    const relPacks = packs.concat(
      globalPacksResult.value ?? [],
      roomsPacksResult.value?.filter((pack) => !globalPackIds.has(pack.id)) ?? []
    );

    return relPacks.filter((pack) => pack.getImages(usage).length > 0);
  }, [userPackResult, globalPacksResult, roomsPacksResult, usage]);

  return [relevantPacks, loading, error];
};
