import React, { useState, useEffect } from 'react';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectRoom } from '../../../client/action/navigation';
import Postie from '../../../util/Postie';

import Selector from './Selector';

import { AtoZ } from './common';

const drawerPostie = new Postie();
function Directs() {
  const { roomList, notifications } = initMatrix;
  const directIds = [...roomList.directs].sort(AtoZ);

  const [, forceUpdate] = useState({});

  function selectorChanged(selectedRoomId, prevSelectedRoomId) {
    if (!drawerPostie.hasTopic('selector-change')) return;
    const addresses = [];
    if (drawerPostie.hasSubscriber('selector-change', selectedRoomId)) addresses.push(selectedRoomId);
    if (drawerPostie.hasSubscriber('selector-change', prevSelectedRoomId)) addresses.push(prevSelectedRoomId);
    if (addresses.length === 0) return;
    drawerPostie.post('selector-change', addresses, selectedRoomId);
  }

  function notiChanged(roomId, total, prevTotal) {
    if (total === prevTotal) return;
    if (drawerPostie.hasTopicAndSubscriber('unread-change', roomId)) {
      drawerPostie.post('unread-change', roomId);
    }
  }

  function roomListUpdated() {
    const { spaces, rooms, directs } = initMatrix.roomList;
    if (!(
      spaces.has(navigation.selectedRoomId)
      || rooms.has(navigation.selectedRoomId)
      || directs.has(navigation.selectedRoomId))
    ) {
      selectRoom(null);
    }
    forceUpdate({});
  }

  useEffect(() => {
    roomList.on(cons.events.roomList.ROOMLIST_UPDATED, roomListUpdated);
    navigation.on(cons.events.navigation.ROOM_SELECTED, selectorChanged);
    notifications.on(cons.events.notifications.NOTI_CHANGED, notiChanged);
    return () => {
      roomList.removeListener(cons.events.roomList.ROOMLIST_UPDATED, roomListUpdated);
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, selectorChanged);
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, notiChanged);
    };
  }, []);

  return directIds.map((id) => (
    <Selector
      key={id}
      roomId={id}
      drawerPostie={drawerPostie}
      onClick={() => selectRoom(id)}
    />
  ));
}

export default Directs;
