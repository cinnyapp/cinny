import initMatrix from '../../client/initMatrix';
import { selectRoom, selectTab, openJoinAlias } from '../../client/action/navigation';

function handleMatrix(url) {
  const mx = initMatrix.matrixClient;
  const rooms = mx.getRooms();

  const roomName = url.hash.slice(2);

  let joinedRoom;

  rooms.forEach((room) => {
    if (room.roomId === roomName
      || room.getCanonicalAlias() === roomName
      || roomName in room.getAltAliases()) {
      joinedRoom = room;
    }
  });

  if (joinedRoom) {
    if (joinedRoom.isSpaceRoom()) selectTab(joinedRoom.roomId);
    else selectRoom(joinedRoom.roomId);

    return;
  }

  openJoinAlias(roomName);
}

export default handleMatrix;
