import React, { useState, useEffect, useRef } from 'react';
import './Drawer.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectTab, selectSpace } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import ScrollView from '../../atoms/scroll/ScrollView';

import DrawerHeader from './DrawerHeader';
import DrawerBreadcrumb from './DrawerBreadcrumb';
import Home from './Home';
import Directs from './Directs';

function Drawer() {
  const [systemState, setSystemState] = useState(null);
  const [selectedTab, setSelectedTab] = useState(navigation.selectedTab);
  const [spaceId, setSpaceId] = useState(navigation.selectedSpaceId);
  const scrollRef = useRef(null);

  useEffect(() => {
    const onTabSelected = (tabId) => {
      setSelectedTab(tabId);
    };
    const onSpaceSelected = (roomId) => {
      setSpaceId(roomId);
    };
    const onRoomLeaved = (roomId) => {
      const lRoomIndex = navigation.selectedSpacePath.indexOf(roomId);
      if (lRoomIndex === -1) return;
      if (lRoomIndex === 0) selectTab(cons.tabs.HOME);
      else selectSpace(navigation.selectedSpacePath[lRoomIndex - 1]);
    };
    navigation.on(cons.events.navigation.TAB_SELECTED, onTabSelected);
    navigation.on(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    initMatrix.roomList.on(cons.events.roomList.ROOM_LEAVED, onRoomLeaved);
    return () => {
      navigation.removeListener(cons.events.navigation.TAB_SELECTED, onTabSelected);
      navigation.removeListener(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_LEAVED, onRoomLeaved);
    };
  }, []);
  useEffect(() => {
    const handleSystemState = (state) => {
      if (state === 'ERROR' || state === 'RECONNECTING' || state === 'STOPPED') {
        setSystemState({ status: 'Connection lost!' });
      }
      if (systemState !== null) setSystemState(null);
    };
    initMatrix.matrixClient.on('sync', handleSystemState);
    return () => {
      initMatrix.matrixClient.removeListener('sync', handleSystemState);
    };
  }, [systemState]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current.scrollTop = 0;
    });
  }, [selectedTab]);

  return (
    <div className="drawer">
      <DrawerHeader selectedTab={selectedTab} spaceId={spaceId} />
      <div className="drawer__content-wrapper">
        {selectedTab !== cons.tabs.DIRECTS && <DrawerBreadcrumb spaceId={spaceId} />}
        <div className="rooms__wrapper">
          <ScrollView ref={scrollRef} autoHide>
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
      { systemState !== null && (
        <div className="drawer__state">
          <Text>{systemState.status}</Text>
        </div>
      )}
    </div>
  );
}

export default Drawer;
