import cons from '../state/cons';
import navigation from '../state/navigation';
import { selectTab, selectSpace, selectRoom } from '../action/navigation';

function initRoomListListener(roomList) {
  const listenRoomLeave = (roomId) => {
    if (navigation.selectedRoomId === roomId) {
      selectRoom(null);
    }

    if (navigation.selectedSpacePath.includes(roomId)) {
      const idIndex = navigation.selectedSpacePath.indexOf(roomId);
      if (idIndex === 0) selectTab(cons.tabs.HOME);
      else selectSpace(navigation.selectedSpacePath[idIndex - 1]);
    }
  };

  roomList.on(cons.events.roomList.ROOM_LEAVED, listenRoomLeave);
  return () => {
    roomList.removeListener(cons.events.roomList.ROOM_LEAVED, listenRoomLeave);
  };
}

// eslint-disable-next-line import/prefer-default-export
export { initRoomListListener };
