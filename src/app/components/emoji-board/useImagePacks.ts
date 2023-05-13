import { ClientEvent, MatrixClient, MatrixEvent, Room, RoomStateEvent } from 'matrix-js-sdk';
import { useCallback, useEffect, useState } from 'react';
import { getRelevantPacks, ImagePack, PackUsage } from './custom-emoji';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { StateEvent } from '../../../types/matrix/room';

export const useRelevantEmojiPacks = (
  mx: MatrixClient,
  usage: PackUsage,
  rooms: Room[]
): ImagePack[] => {
  const getPacks = useCallback(
    () => getRelevantPacks(mx, rooms).filter((pack) => pack.getImagesFor(usage).length > 0),
    [mx, usage, rooms]
  );

  const [relevantPacks, setRelevantPacks] = useState(() => getPacks());

  useEffect(() => {
    const handleUpdate = (event: MatrixEvent) => {
      if (
        event.getType() === AccountDataEvent.PoniesEmoteRooms ||
        event.getType() === AccountDataEvent.PoniesUserEmotes
      ) {
        setRelevantPacks(getPacks());
      }
      const eventRoomId = event.getRoomId();
      if (
        eventRoomId &&
        event.getType() === StateEvent.PoniesRoomEmotes &&
        rooms.find((room) => room.roomId === eventRoomId)
      ) {
        setRelevantPacks(getPacks());
      }
    };

    mx.on(ClientEvent.AccountData, handleUpdate);
    mx.on(RoomStateEvent.Events, handleUpdate);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handleUpdate);
      mx.removeListener(RoomStateEvent.Events, handleUpdate);
    };
  }, [mx, rooms, getPacks]);

  return relevantPacks;
};
