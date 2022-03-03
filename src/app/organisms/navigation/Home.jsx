import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import Postie from '../../../util/Postie';

import RoomsCategory from './RoomsCategory';

import { useCategorizedSpaces } from '../../hooks/useCategorizedSpaces';
import { AtoZ, RoomToDM } from './common';

const drawerPostie = new Postie();
function Home({ spaceId }) {
  const mx = initMatrix.matrixClient;
  const { roomList, notifications, accountData } = initMatrix;
  const {
    spaces, rooms, directs, roomIdToParents,
  } = roomList;
  const categorizedSpaces = useCategorizedSpaces();
  const isCategorized = accountData.categorizedSpaces.has(spaceId);

  let categories = null;
  let spaceIds = [];
  let roomIds = [];
  let directIds = [];

  const spaceChildIds = roomList.getSpaceChildren(spaceId);
  if (spaceChildIds) {
    spaceIds = spaceChildIds.filter((roomId) => spaces.has(roomId));
    roomIds = spaceChildIds.filter((roomId) => rooms.has(roomId));
    directIds = spaceChildIds.filter((roomId) => directs.has(roomId));
  } else {
    spaceIds = [...spaces].filter((roomId) => !roomIdToParents.has(roomId));
    roomIds = [...rooms].filter((roomId) => !roomIdToParents.has(roomId));
  }

  spaceIds.sort(AtoZ);
  roomIds.sort(AtoZ);
  directIds.sort(AtoZ);

  if (isCategorized) {
    categories = roomList.getCategorizedSpaces(spaceIds);
  }

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
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, selectorChanged);
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, notiChanged);
    };
  }, []);

  return (
    <>
      { !isCategorized && spaceIds.length !== 0 && (
        <RoomsCategory name="Spaces" roomIds={spaceIds} drawerPostie={drawerPostie} />
      )}

      { roomIds.length !== 0 && (
        <RoomsCategory name="Rooms" roomIds={roomIds} drawerPostie={drawerPostie} />
      )}

      { directIds.length !== 0 && (
        <RoomsCategory name="People" roomIds={directIds} drawerPostie={drawerPostie} />
      )}

      { isCategorized && [...categories].map(([catId, childIds]) => (
        <RoomsCategory
          key={catId}
          spaceId={catId}
          name={mx.getRoom(catId).name}
          roomIds={[...childIds].sort(AtoZ).sort(RoomToDM)}
          drawerPostie={drawerPostie}
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
