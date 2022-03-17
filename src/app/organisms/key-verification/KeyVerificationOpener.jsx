import React, { useState, useEffect } from 'react';
import './KeyVerification.scss';

import initMatrix from '../../../client/initMatrix';

import IconButton from '../../atoms/button/IconButton';
import Dialog from '../../molecules/dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import KeyVerification from './KeyVerification';
import navigation from '../../../client/state/navigation';
import cons from '../../../client/state/cons';

function KeyVerificationOpener() {
  const [open, setOpen] = useState(null);
  const [request, setRequest] = useState(null);

  const handleOpen = (req) => {
    setRequest(req);
    setOpen(true);
  };

  const closeDialog = () => setOpen(false);

  useEffect(() => {
    initMatrix.matrixClient.on('crypto.verification.request', handleOpen);
    navigation.on(cons.events.navigation.KEY_VERIFICATION_OPENED, handleOpen);
  });

  return (
    <Dialog
      className="key-verification__dialog"
      isOpen={open}
      title="Key verification"
      onRequestClose={closeDialog}
      contentOptions={<IconButton src={CrossIC} onClick={closeDialog} tooltip="Close" />}
    >
      <KeyVerification request={request} onRequestClose={closeDialog} />
    </Dialog>
  );
}

export default KeyVerificationOpener;
