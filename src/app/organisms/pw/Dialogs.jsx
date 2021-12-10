import React from 'react';

import ReadReceipts from '../read-receipts/ReadReceipts';
import ProfileViewer from '../profile-viewer/ProfileViewer';
import Search from '../search/Search';

function Dialogs() {
  return (
    <>
      <ReadReceipts />
      <ProfileViewer />
      <Search />
    </>
  );
}

export default Dialogs;
