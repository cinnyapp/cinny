import React, { useState, useEffect } from 'react';
import './Drawer.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import ScrollView from '../../atoms/scroll/ScrollView';

import DrawerHeader from './DrawerHeader';
import Home from './Home';
import Directs from './Directs';

function DrawerBradcrumb() {
  return (
    <div className="breadcrumb__wrapper">
      <ScrollView horizontal vertical={false}>
        <div>
          {/* TODO: bradcrumb space paths when spaces become a thing */}
        </div>
      </ScrollView>
    </div>
  );
}

function Drawer() {
  const [activeTab, setActiveTab] = useState('home');

  function onTabChanged(tabId) {
    setActiveTab(tabId);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.TAB_CHANGED, onTabChanged);
    return () => {
      navigation.removeListener(cons.events.navigation.TAB_CHANGED, onTabChanged);
    };
  }, []);
  return (
    <div className="drawer">
      <DrawerHeader activeTab={activeTab} />
      <div className="drawer__content-wrapper">
        <DrawerBradcrumb />
        <div className="channels__wrapper">
          <ScrollView autoHide>
            <div className="channels-container">
              {
                activeTab === 'home'
                  ? <Home />
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
