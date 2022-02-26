import React from 'react';

import ReadReceipts from '../read-receipts/ReadReceipts';
import ProfileViewer from '../profile-viewer/ProfileViewer';
import SpaceAddExisting from '../../molecules/space-add-existing/SpaceAddExisting';
import Search from '../search/Search';
import ViewSource from '../view-source/ViewSource';
import CreateRoom from '../create-room/CreateRoom';

function Dialogs() {
  return (
    <>
      <ReadReceipts />
      <ViewSource />
      <ProfileViewer />
      <CreateRoom />
      <SpaceAddExisting />
      <Search />
    </>
  );
}

export default Dialogs;
