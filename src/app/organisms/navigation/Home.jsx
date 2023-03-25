import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import Postie from '../../../util/Postie';
import { roomIdByActivity, roomIdByAtoZ } from '../../../util/sort';

import RoomsCategory from './RoomsCategory';

import { useCategorizedSpaces } from '../../hooks/useCategorizedSpaces';

const drawerPostie = new Postie();
function Home({ spaceId, jitsiCallId }) {
  const mx = initMatrix.matrixClient;
  const { roomList, notifications, accountData } = initMatrix;
  const { spaces, rooms, directs } = roomList;
  useCategorizedSpaces();
  const isCategorized = accountData.categorizedSpaces.has(spaceId);

  let categories = null;
  let spaceIds = [];
  let roomIds = [];
  let directIds = [];
  let videoRoomIds = [];

  if (spaceId) {
    const spaceChildIds = roomList.getSpaceChildren(spaceId) ?? [];
    const TOPIC_JITSI_CALL = 'd38dd491fefa1cfffc27f9c57f2bdb4a';
    spaceIds = spaceChildIds.filter((roomId) => spaces.has(roomId));
    roomIds = spaceChildIds.filter(
      (roomId) =>
        rooms.has(roomId) &&
        mx.getRoom(roomId).currentState.getStateEvents('m.room.topic')[0]?.getContent().topic !==
          TOPIC_JITSI_CALL
    );
    videoRoomIds = spaceChildIds.filter(
      (roomId) =>
        rooms.has(roomId) &&
        mx.getRoom(roomId).currentState.getStateEvents('m.room.topic')[0]?.getContent().topic ===
          TOPIC_JITSI_CALL
    );
    directIds = spaceChildIds.filter((roomId) => directs.has(roomId));
  } else {
    spaceIds = roomList.getOrphanSpaces().filter((id) => !accountData.spaceShortcut.has(id));
    roomIds = roomList.getOrphanRooms();
  }

  if (isCategorized) {
    categories = roomList.getCategorizedSpaces(spaceIds);
    categories.delete(spaceId);
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
    notifications.on(cons.events.notifications.MUTE_TOGGLED, notiChanged);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, selectorChanged);
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, notiChanged);
      notifications.removeListener(cons.events.notifications.MUTE_TOGGLED, notiChanged);
    };
  }, []);

  return (
    <>
      {!isCategorized && spaceIds.length !== 0 && (
        <RoomsCategory
          name="Spaces"
          roomIds={spaceIds.sort(roomIdByAtoZ)}
          drawerPostie={drawerPostie}
        />
      )}

      {roomIds.length !== 0 && (
        <RoomsCategory
          name="Text Rooms"
          roomIds={roomIds.sort(roomIdByAtoZ)}
          drawerPostie={drawerPostie}
        />
      )}

      {videoRoomIds.length !== 0 && (
        <RoomsCategory
          name="Video Rooms"
          roomIds={videoRoomIds}
          drawerPostie={drawerPostie}
          jitsiCallId={jitsiCallId}
        />
      )}

      {directIds.length !== 0 && (
        <RoomsCategory
          name="People"
          roomIds={directIds.sort(roomIdByActivity)}
          drawerPostie={drawerPostie}
        />
      )}

      {isCategorized &&
        [...categories.keys()].sort(roomIdByAtoZ).map((catId) => {
          const rms = [];
          const dms = [];
          categories.get(catId).forEach((id) => {
            if (directs.has(id)) dms.push(id);
            else rms.push(id);
          });
          rms.sort(roomIdByAtoZ);
          dms.sort(roomIdByActivity);
          return (
            <RoomsCategory
              key={catId}
              spaceId={catId}
              name={mx.getRoom(catId).name}
              roomIds={rms.concat(dms)}
              drawerPostie={drawerPostie}
            />
          );
        })}
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
