import { invoke } from '@tauri-apps/api/tauri';
import initMatrix from '../client/initMatrix';
import { selectRoom, selectTab, openJoinAlias } from '../client/action/navigation';

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

const handlers = {
  'matrix.to': (url) => handleMatrix(url),
};

export default function handleLink(e) {
  const url = new URL(e.target.href);
  const handler = handlers[url.hostname];

  if (handler) {
    handler(url);
    e.preventDefault();
    return;
  }

  // if running inside tauri, check if the tauri backend has a custom handler for this link
  // useful so we can open urls in a specified app
  if (window.__TAURI__) {
    e.preventDefault();
    invoke('open_link', { url: e.target.href, bypassHandlers: false });
  } else {
    window.open(e.target.href);
    e.preventDefault();
  }
}
