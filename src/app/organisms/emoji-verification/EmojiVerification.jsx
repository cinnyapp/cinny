/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './EmojiVerification.scss';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { hasPrivateKey } from '../../../client/state/secretStorageKeys';
import { getDefaultSSKey, isCrossVerified } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Spinner from '../../atoms/spinner/Spinner';
import Dialog from '../../molecules/dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import { useStore } from '../../hooks/useStore';
import { accessSecretStorage } from '../settings/SecretStorageAccess';

function EmojiVerificationContent({ request, requestClose }) {
  const [sas, setSas] = useState(null);
  const [process, setProcess] = useState(false);
  const mx = initMatrix.matrixClient;
  const mountStore = useStore();

  useEffect(() => {
    mountStore.setItem(true);
    const handleChange = () => {
      if (request.done || request.cancelled) requestClose();
    };

    if (request === null) return null;
    const req = request;
    req.on('change', handleChange);
    return () => {
      req.off('change', handleChange);
      if (!req.cancelled && !req.done) {
        req.cancel();
      }
    };
  }, [request]);

  const acceptRequest = async () => {
    if (isCrossVerified(mx.deviceId) && !hasPrivateKey(getDefaultSSKey())) {
      const keyData = await accessSecretStorage('Session verification');
      if (!keyData) {
        request.cancel();
        return;
      }
    }
    setProcess(true);
    await request.accept();

    let targetDevice;
    try {
      targetDevice = request.targetDevice;
    } catch {
      targetDevice = {
        userId: mx.getUserId(),
        deviceId: request.channel.devices[0],
      };
    }

    const verifier = request.beginKeyVerification('m.sas.v1', targetDevice);

    const handleVerifier = (data) => {
      verifier.off('show_sas', handleVerifier);
      if (!mountStore.getItem()) return;
      setSas(data);
      setProcess(false);
    };
    verifier.on('show_sas', handleVerifier);
    await verifier.verify();
  };

  const sasMismatch = () => {
    sas.mismatch();
    setProcess(true);
  };

  const sasConfirm = () => {
    sas.confirm();
    setProcess(true);
  };

  const renderWait = () => (
    <>
      <Spinner size="small" />
      <Text>Waiting for response from other device...</Text>
    </>
  );

  if (sas !== null) {
    return (
      <div className="emoji-verification__content">
        <Text>Confirm the emoji below are displayed on both devices, in the same order:</Text>
        <div className="emoji-verification__emojis">
          {sas.sas.emoji.map((emoji, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="emoji-verification__emoji-block" key={`${emoji[1]}-${i}`}>
              <Text variant="h1">{twemojify(emoji[0])}</Text>
              <Text>{emoji[1]}</Text>
            </div>
          ))}
        </div>
        <div className="emoji-verification__buttons">
          {process ? renderWait() : (
            <>
              <Button variant="primary" onClick={sasConfirm}>They match</Button>
              <Button onClick={sasMismatch}>{'They don\'t match'}</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="emoji-verification__content">
      <Text>Click accept to start the verification process</Text>
      <div className="emoji-verification__buttons">
        {
          process
            ? renderWait()
            : <Button variant="primary" onClick={acceptRequest}>Accept</Button>
        }
      </div>
    </div>
  );
}
EmojiVerificationContent.propTypes = {
  request: PropTypes.shape({}).isRequired,
  requestClose: PropTypes.func.isRequired,
};

function useVisibilityToggle() {
  const [request, setRequest] = useState(null);
  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleOpen = (req) => setRequest(req);
    navigation.on(cons.events.navigation.EMOJI_VERIFICATION_OPENED, handleOpen);
    mx.on('crypto.verification.request', handleOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.EMOJI_VERIFICATION_OPENED, handleOpen);
      mx.removeListener('crypto.verification.request', handleOpen);
    };
  }, []);

  const requestClose = () => setRequest(null);

  return [request, requestClose];
}

function EmojiVerification() {
  const [request, requestClose] = useVisibilityToggle();

  return (
    <Dialog
      isOpen={request !== null}
      className="emoji-verification"
      title={(
        <Text variant="s1" weight="medium" primary>
          Emoji verification
        </Text>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {
        request !== null
          ? <EmojiVerificationContent request={request} requestClose={requestClose} />
          : <div />
      }
    </Dialog>
  );
}

export default EmojiVerification;
