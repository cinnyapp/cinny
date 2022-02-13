import React, { useState, useEffect } from 'react';
import './KeyVerification.scss';

import initMatrix from '../../../client/initMatrix';

import IconButton from '../../atoms/button/IconButton';
import Dialog from '../../molecules/dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import KeyVerification from './KeyVerification';

function KeyVerificationOpener() {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    initMatrix.matrixClient.on('crypto.verification.request', (req) => {
      if (request === null) setRequest(req);
    });
  });

  const closeDialog = () => setRequest(null);

  return (
    <Dialog
      className="key-verification__dialog"
      isOpen={request !== null}
      title="Key verification"
      onRequestClose={closeDialog}
      contentOptions={<IconButton src={CrossIC} onClick={closeDialog} tooltip="Close" />}
    >
      <KeyVerification request={request} onRequestClose={closeDialog} />
    </Dialog>
  );
}

export default KeyVerificationOpener;
