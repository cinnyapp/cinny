import React, { useEffect } from 'react';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import Postie from '../../../util/Postie';
import { roomIdByLastActive } from '../../../util/sort';

import RoomsCategory from './RoomsCategory';

const drawerPostie = new Postie();
function Directs() {
  const { roomList, notifications } = initMatrix;
  const directIds = [...roomList.directs].sort(roomIdByLastActive);

  useEffect(() => {
    const selectorChanged = (selectedRoomId, prevSelectedRoomId) => {
      if (!drawerPostie.hasTopic('selector-change')) return;
      const addresses = [];
      if (drawerPostie.hasSubscriber('selector-change', selectedRoomId)) addresses.push(selectedRoomId);
      if (drawerPostie.hasSubscriber('selector-change', prevSelectedRoomId)) addresses.push(prevSelectedRoomId);
      if (addresses.length === 0) return;
      drawerPostie.post('selector-change', addresses, selectedRoomId);
    };

    const notiChanged = (roomId, total, prevTotal) => {
      if (total === prevTotal) return;
      if (drawerPostie.hasTopicAndSubscriber('unread-change', roomId)) {
        drawerPostie.post('unread-change', roomId);
      }
    };

    navigation.on(cons.events.navigation.ROOM_SELECTED, selectorChanged);
    notifications.on(cons.events.notifications.NOTI_CHANGED, notiChanged);
    notifications.on(cons.events.notifications.MUTE_TOGGLED, notiChanged);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, selectorChanged);
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, notiChanged);
      notifications.removeListener(cons.events.notifications.MUTE_TOGGLED, notiChanged);
    };
  }, []);

  return <RoomsCategory name="People" hideHeader roomIds={directIds} drawerPostie={drawerPostie} />;
}

export default Directs;
