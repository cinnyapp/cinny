import React from 'react';
import './Navigation.scss';

import SideBar from './SideBar';
import Drawer from './Drawer';

function Navigation() {
  return (
    <div className="navigation">
      <SideBar />
      <Drawer />
    </div>
  );
}

export default Navigation;
