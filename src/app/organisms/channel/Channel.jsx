import React, { useState, useEffect } from 'react';
import './Channel.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import Welcome from '../welcome/Welcome';
import ChannelView from './ChannelView';
import PeopleDrawer from './PeopleDrawer';

function Channel() {
  const [selectedRoomId, changeSelectedRoomId] = useState(null);
  const [isDrawerVisible, toggleDrawerVisiblity] = useState(navigation.isPeopleDrawerVisible);
  useEffect(() => {
    const handleRoomSelected = (roomId) => {
      changeSelectedRoomId(roomId);
    };
    const handleDrawerToggling = (visiblity) => {
      toggleDrawerVisiblity(visiblity);
    };
    navigation.on(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    navigation.on(cons.events.navigation.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);

    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
      navigation.removeListener(cons.events.navigation.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);
    };
  }, []);

  if (selectedRoomId === null) return <Welcome />;

  return (
    <div className="channel-container">
      <ChannelView roomId={selectedRoomId} />
      { isDrawerVisible && <PeopleDrawer roomId={selectedRoomId} />}
    </div>
  );
}

export default Channel;
