import React, { useState, useEffect } from 'react';
import './Navigation.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { handleTabChange } from '../../../client/action/navigation';

import SideBar from './SideBar';
import Drawer from './Drawer';

function Navigation() {
  const [activeTab, changeActiveTab] = useState(navigation.getActiveTab());

  function changeTab(tabId) {
    handleTabChange(tabId);
  }

  useEffect(() => {
    const handleTab = () => {
      changeActiveTab(navigation.getActiveTab());
    };
    navigation.on(cons.events.navigation.TAB_CHANGED, handleTab);

    return () => {
      navigation.removeListener(cons.events.navigation.TAB_CHANGED, handleTab);
    };
  }, []);
  return (
    <div className="navigation">
      <SideBar tabId={activeTab} changeTab={changeTab} />
      <Drawer tabId={activeTab} />
    </div>
  );
}

export default Navigation;
