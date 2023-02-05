import React from 'react';
import './Navigation.scss';

import { Sidebar1 } from './Sidebar1';
import SideBar from './SideBar';
import Drawer from './Drawer';

function Navigation() {
  return (
    <div className="navigation">
      <Sidebar1 />
      <SideBar />
      <Drawer />
    </div>
  );
}

export default Navigation;
