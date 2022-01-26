import cons from '../state/cons';
import navigation from '../state/navigation';
import { selectTab, selectSpace } from '../action/navigation';

const listenRoomLeave = (roomId) => {
  const lRoomIndex = navigation.selectedSpacePath.indexOf(roomId);
  if (lRoomIndex === -1) return;
  if (lRoomIndex === 0) selectTab(cons.tabs.HOME);
  else selectSpace(navigation.selectedSpacePath[lRoomIndex - 1]);
};

function initRoomListListener(roomList) {
  roomList.on(cons.events.roomList.ROOM_LEAVED, listenRoomLeave);
}
function removeRoomListListener(roomList) {
  roomList.removeListener(cons.events.roomList.ROOM_LEAVED, listenRoomLeave);
}

export { initRoomListListener, removeRoomListListener };
