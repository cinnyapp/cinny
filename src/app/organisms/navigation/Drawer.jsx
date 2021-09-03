import React, { useState, useEffect } from 'react';
import './Drawer.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import ScrollView from '../../atoms/scroll/ScrollView';

import DrawerHeader from './DrawerHeader';
import DrawerBreadcrumb from './DrawerBreadcrumb';
import Home from './Home';
import Directs from './Directs';

function Drawer() {
  const [selectedTab, setSelectedTab] = useState('home');
  const [spaceId, setSpaceId] = useState(navigation.selectedSpaceId);

  function onTabChanged(tabId) {
    setSelectedTab(tabId);
  }
  function onSpaceSelected(roomId) {
    setSpaceId(roomId);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.TAB_CHANGED, onTabChanged);
    navigation.on(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.TAB_CHANGED, onTabChanged);
      navigation.removeListener(cons.events.navigation.SPACE_SELECTED, onSpaceSelected);
    };
  }, []);
  return (
    <div className="drawer">
      <DrawerHeader selectedTab={selectedTab} spaceId={spaceId} />
      <div className="drawer__content-wrapper">
        {selectedTab === 'home' && <DrawerBreadcrumb />}
        <div className="rooms__wrapper">
          <ScrollView autoHide>
            <div className="rooms-container">
              {
                selectedTab === 'home'
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
