import React from 'react';

import ReadReceipts from '../read-receipts/ReadReceipts';
import ProfileViewer from '../profile-viewer/ProfileViewer';
import SpaceAddExisting from '../../molecules/space-add-existing/SpaceAddExisting';
import Search from '../search/Search';

function Dialogs() {
  return (
    <>
      <ReadReceipts />
      <ProfileViewer />
      <SpaceAddExisting />
      <Search />
    </>
  );
}

export default Dialogs;
