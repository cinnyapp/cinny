import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectSpace, selectRoom } from '../../../client/action/navigation';
import Postie from '../../../util/Postie';

import Text from '../../atoms/text/Text';
import Selector from './Selector';

import { AtoZ } from './common';

const drawerPostie = new Postie();
function Home({ spaceId }) {
  const [, forceUpdate] = useState({});
  const { roomList } = initMatrix;
  let spaceIds = [];
  let roomIds = [];
  let directIds = [];

  const spaceChildIds = roomList.getSpaceChildren(spaceId);
  if (spaceChildIds) {
    spaceIds = spaceChildIds.filter((roomId) => roomList.spaces.has(roomId)).sort(AtoZ);
    roomIds = spaceChildIds.filter((roomId) => roomList.rooms.has(roomId)).sort(AtoZ);
    directIds = spaceChildIds.filter((roomId) => roomList.directs.has(roomId)).sort(AtoZ);
  } else {
    spaceIds = [...roomList.spaces]
      .filter((roomId) => !roomList.roomIdToParents.has(roomId)).sort(AtoZ);
    roomIds = [...roomList.rooms]
      .filter((roomId) => !roomList.roomIdToParents.has(roomId)).sort(AtoZ);
  }

  function selectorChanged(selectedRoomId, prevSelectedRoomId) {
    if (!drawerPostie.hasTopic('selector-change')) return;
    const addresses = [];
    if (drawerPostie.hasSubscriber('selector-change', selectedRoomId)) addresses.push(selectedRoomId);
    if (drawerPostie.hasSubscriber('selector-change', prevSelectedRoomId)) addresses.push(prevSelectedRoomId);
    if (addresses.length === 0) return;
    drawerPostie.post('selector-change', addresses, selectedRoomId);
  }
  function unreadChanged(roomId) {
    if (!drawerPostie.hasTopic('unread-change')) return;
    if (!drawerPostie.hasSubscriber('unread-change', roomId)) return;
    drawerPostie.post('unread-change', roomId);
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
          onClick={() => selectSpace(id)}
        />
      ))}

      { roomIds.length !== 0 && <Text className="cat-header" variant="b3">Rooms</Text> }
      { roomIds.map((id) => (
        <Selector
          key={id}
          roomId={id}
          isDM={false}
          drawerPostie={drawerPostie}
          onClick={() => selectRoom(id)}
        />
      )) }

      { directIds.length !== 0 && <Text className="cat-header" variant="b3">People</Text> }
      { directIds.map((id) => (
        <Selector
          key={id}
          roomId={id}
          drawerPostie={drawerPostie}
          onClick={() => selectRoom(id)}
        />
      ))}
    </>
  );
}
Home.defaultProps = {
  spaceId: null,
};
Home.propTypes = {
  spaceId: PropTypes.string,
};

export default Home;
