import React from 'react';
import './Navigation.scss';

import SideBar from './SideBar';
import Drawer from './Drawer';
import { EditorPreview } from '../../components/editor/Editor.preview';

function Navigation() {
  return (
    <div className="navigation">
      <EditorPreview />
      <SideBar />
      <Drawer />
    </div>
  );
}

export default Navigation;
