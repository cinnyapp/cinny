import React, { useState, useEffect } from 'react';
import './Drawer.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectTab, selectSpace } from '../../../client/action/navigation';

import ScrollView from '../../atoms/scroll/ScrollView';

import DrawerHeader from './DrawerHeader';
import DrawerBreadcrumb from './DrawerBreadcrumb';
import Home from './Home';
import Directs from './Directs';

function Drawer() {
  const [selectedTab, setSelectedTab] = useState(navigation.selectedTab);
  const [spaceId, setSpaceId] = useState(navigation.selectedSpaceId);

  function onTabSelected(tabId) {
    setSelectedTab(tabId);
  }
  function onSpaceSelected(roomId) {
    setSpaceId(roomId);
  }
  function onRoomLeaved(roomId) {
    const lRoomIndex = navigation.selectedSpacePath.indexOf(roomId);
    if (lRoomIndex === -1) return;
    if (lRoomIndex === 0) selectTab(cons.tabs.HOME);
    else selectSpace(navigation.selectedSpacePath[lRoomIndex - 1]);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.TAB_SELECTED, onTabSelected);
    navigation.on(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    initMatrix.roomList.on(cons.events.roomList.ROOM_LEAVED, onRoomLeaved);
    return () => {
      navigation.removeListener(cons.events.navigation.TAB_SELECTED, onTabSelected);
      navigation.removeListener(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_LEAVED, onRoomLeaved);
    };
  }, []);
  return (
    <div className="drawer">
      <DrawerHeader selectedTab={selectedTab} spaceId={spaceId} />
      <div className="drawer__content-wrapper">
        {selectedTab !== cons.tabs.DIRECTS && <DrawerBreadcrumb spaceId={spaceId} />}
        <div className="rooms__wrapper">
          <ScrollView autoHide>
            <div className="rooms-container">
              {
                selectedTab !== cons.tabs.DIRECTS
                  ? <Home spaceId={spaceId} />
                  : <Directs />
              }
            </div>
          </ScrollView>
        </div>
      </div>
    </div>
  );
}

export default Drawer;
