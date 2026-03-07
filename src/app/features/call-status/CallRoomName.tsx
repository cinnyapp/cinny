import React from 'react';
import { Room } from 'matrix-js-sdk';
import { Chip, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { useRoomName } from '../../hooks/useRoomMeta';
import { RoomIcon } from '../../components/room-avatar';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { getAllParents, guessPerfectParent } from '../../utils/room';
import { useOrphanSpaces } from '../../state/hooks/roomList';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { useAllJoinedRoomsSet, useGetRoom } from '../../hooks/useGetRoom';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';

type CallRoomNameProps = {
  room: Room;
};
export function CallRoomName({ room }: CallRoomNameProps) {
  const mx = useMatrixClient();
  const name = useRoomName(room);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const mDirects = useAtomValue(mDirectAtom);
  const dm = mDirects.has(room.roomId);

  const allRoomsSet = useAllJoinedRoomsSet();
  const getRoom = useGetRoom(allRoomsSet);

  const allParents = getAllParents(roomToParents, room.roomId);
  const orphanParents = allParents && orphanSpaces.filter((o) => allParents.has(o));
  const perfectOrphanParent = orphanParents && guessPerfectParent(mx, room.roomId, orphanParents);

  const { navigateRoom } = useRoomNavigate();

  return (
    <Chip
      variant="Background"
      radii="Pill"
      before={
        <RoomIcon size="200" joinRule={room.getJoinRule()} roomType={room.getType()} filled />
      }
      onClick={() => navigateRoom(room.roomId)}
    >
      <Text size="L400" truncate>
        {name}
        {!dm && perfectOrphanParent && (
          <Text as="span" size="T200" priority="300">
            {' •'} <b>{getRoom(perfectOrphanParent)?.name ?? perfectOrphanParent}</b>
          </Text>
        )}
      </Text>
    </Chip>
  );
}
