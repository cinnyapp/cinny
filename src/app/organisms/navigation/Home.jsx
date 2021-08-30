import React, { useState, useEffect } from 'react';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectRoom } from '../../../client/action/navigation';
import Postie from '../../../util/Postie';

import Text from '../../atoms/text/Text';
import Selector from './Selector';

import { AtoZ } from './common';

const drawerPostie = new Postie();
function Home() {
  const { roomList } = initMatrix;
  const spaceIds = [...roomList.spaces].sort(AtoZ);
  const roomIds = [...roomList.rooms].sort(AtoZ);

  const [, forceUpdate] = useState({});

  function selectorChanged(activeRoomID, prevActiveRoomId) {
    if (!drawerPostie.hasTopic('selector-change')) return;
    const addresses = [];
    if (drawerPostie.hasSubscriber('selector-change', activeRoomID)) addresses.push(activeRoomID);
    if (drawerPostie.hasSubscriber('selector-change', prevActiveRoomId)) addresses.push(prevActiveRoomId);
    if (addresses.length === 0) return;
    drawerPostie.post('selector-change', addresses, activeRoomID);
  }
  function unreadChanged(roomId) {
    if (!drawerPostie.hasTopic('unread-change')) return;
    if (!drawerPostie.hasSubscriber('unread-change', roomId)) return;
    drawerPostie.post('unread-change', roomId);
  }

  function roomListUpdated() {
    const { spaces, rooms, directs } = initMatrix.roomList;
    if (!(
      spaces.has(navigation.getActiveRoomId())
      || rooms.has(navigation.getActiveRoomId())
      || directs.has(navigation.getActiveRoomId()))
    ) {
      selectRoom(null);
    }
    forceUpdate({});
  }

  useEffect(() => {
    roomList.on(cons.events.roomList.ROOMLIST_UPDATED, roomListUpdated);
    navigation.on(cons.events.navigation.ROOM_SELECTED, selectorChanged);
    roomList.on(cons.events.roomList.MY_RECEIPT_ARRIVED, unreadChanged);
    roomList.on(cons.events.roomList.EVENT_ARRIVED, unreadChanged);
    return () => {
      roomList.removeListener(cons.events.roomList.ROOMLIST_UPDATED, roomListUpdated);
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, selectorChanged);
      roomList.removeListener(cons.events.roomList.MY_RECEIPT_ARRIVED, unreadChanged);
      roomList.removeListener(cons.events.roomList.EVENT_ARRIVED, unreadChanged);
    };
  }, []);

  return (
    <>
      { spaceIds.length !== 0 && <Text className="cat-header" variant="b3">Spaces</Text> }
      { spaceIds.map((id) => (
        <Selector
          key={id}
          roomId={id}
          isDM={false}
          drawerPostie={drawerPostie}
        />
      ))}

      { roomIds.length !== 0 && <Text className="cat-header" variant="b3">Channels</Text> }
      { roomIds.map((id) => (
        <Selector
          key={id}
          roomId={id}
          isDM={false}
          drawerPostie={drawerPostie}
        />
      )) }
    </>
  );
}

export default Home;
