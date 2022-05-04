import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import Postie from '../../../util/Postie';
import { roomIdByActivity } from '../../../util/sort';

import RoomsCategory from './RoomsCategory';

const drawerPostie = new Postie();
function Directs({ size }) {
  const mx = initMatrix.matrixClient;
  const { roomList, notifications } = initMatrix;
  const [directIds, setDirectIds] = useState([]);

  useEffect(() => setDirectIds([...roomList.directs].sort(roomIdByActivity)), [size]);

  useEffect(() => {
    const handleTimeline = (event, room, toStartOfTimeline, removed, data) => {
      if (!roomList.directs.has(room.roomId)) return;
      if (!data.liveEvent) return;
      if (directIds[0] === room.roomId) return;
      const newDirectIds = [room.roomId];
      directIds.forEach((id) => {
        if (id === room.roomId) return;
        newDirectIds.push(id);
      });
      setDirectIds(newDirectIds);
    };
    mx.on('Room.timeline', handleTimeline);
    return () => {
      mx.removeListener('Room.timeline', handleTimeline);
    };
  }, [directIds]);

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
Directs.propTypes = {
  size: PropTypes.number.isRequired,
};

export default Directs;
