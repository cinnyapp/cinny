import React, { useState, useEffect } from 'react';
import './Room.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import RoomTimeline from '../../../client/state/RoomTimeline';
import navigation from '../../../client/state/navigation';

import Welcome from '../welcome/Welcome';
import RoomView from './RoomView';
import RoomSettings from './RoomSettings';
import PeopleDrawer from './PeopleDrawer';

function Room() {
  const [compactSize, setCompactSize] = useState(window.innerWidth < 750);
  const [roomTimeline, setRoomTimeline] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [isDrawer, setIsDrawer] = useState(settings.isPeopleDrawer);

  // #region Check if screen size is small
  const updateCompactSize = () => setCompactSize(window.innerWidth < 750);

  useEffect(() => {
    window.addEventListener('resize', updateCompactSize);
    return (() => {
      window.removeEventListener('resize', updateCompactSize);
    });
  }, [compactSize]);
  // #endregion

  const mx = initMatrix.matrixClient;
  const handleRoomSelected = (rId, pRoomId, eId) => {
    if (mx.getRoom(rId)) {
      setRoomTimeline(new RoomTimeline(rId, initMatrix.notifications));
      setEventId(eId);
    } else {
      // TODO: add ability to join room if roomId is invalid
      setRoomTimeline(null);
      setEventId(null);
    }
  };
  const handleDrawerToggling = (visiblity) => setIsDrawer(visiblity);

  useEffect(() => {
    navigation.on(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    settings.on(cons.events.settings.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);
    return () => {
      settings.removeListener(cons.events.settings.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);
      roomTimeline?.removeInternalListeners();
    };
  }, []);

  if (roomTimeline === null) return <Welcome />;

  return (
    <div className="room">
      <div className="room__content">
        <RoomSettings roomId={roomTimeline.roomId} />
        <RoomView roomTimeline={roomTimeline} eventId={eventId} />
      </div>
      {/* On compact screen sizes there is not enough space
          but no need to view it otherwise as it already is in settings */}
      {!compactSize && isDrawer && <PeopleDrawer roomId={roomTimeline.roomId} />}
    </div>
  );
}

export default Room;
