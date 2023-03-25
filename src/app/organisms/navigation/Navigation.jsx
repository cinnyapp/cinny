import React from 'react';
import './Navigation.scss';

import SideBar from './SideBar';
import Drawer from './Drawer';

function Navigation({jitsiCallId}) {
  return (
    <div className="navigation">
      <SideBar />
      <Drawer jitsiCallId={jitsiCallId} />
    </div>
  );
}

export default Navigation;
