import React from 'react';
import { Chip, Icon, Icons, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { RoomIcon } from '../../components/room-avatar';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { getAllParents, guessPerfectParent } from '../../utils/room';
import { useOrphanSpaces } from '../../state/hooks/roomList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useClient } from '../../hooks/useClient';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useObservableValue } from '../../hooks/useObservableValue';

type CallRoomNameProps = {
  roomId: string;
};
export function CallRoomName({ roomId }: CallRoomNameProps) {
  const ct = useClient();
  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);
  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);
  const name = getRoomName(roomId);

  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(ct, allRoomsAtom, roomToParents);
  const mDirects = useAtomValue(mDirectAtom);
  const dm = mDirects.has(roomId);

  const allParents = getAllParents(roomToParents, roomId);
  const orphanParents = allParents && orphanSpaces.filter((o) => allParents.has(o));
  const perfectOrphanParent =
    orphanParents &&
    guessPerfectParent(
      roomId,
      orphanParents,
      (rId) => ct.roomToCreators.read.get(rId),
      () => undefined
    );

  const { navigateRoom } = useRoomNavigate();

  return (
    <Chip
      variant="Background"
      radii="Pill"
      before={
        dm ? (
          <Icon size="200" src={Icons.VolumeHigh} filled />
        ) : (
          <RoomIcon
            size="200"
            joinRule={roomToJoinRule.get(roomId)}
            roomType={ct.roomToType.read.get(roomId)}
            filled
          />
        )
      }
      onClick={() => navigateRoom(roomId)}
    >
      <Text size="L400" truncate>
        {name}
        {!dm && perfectOrphanParent && (
          <Text as="span" size="T200" priority="300">
            {' •'} <b>{getRoomName(perfectOrphanParent) ?? perfectOrphanParent}</b>
          </Text>
        )}
      </Text>
    </Chip>
  );
}
