import React, { useState, useEffect, useRef } from 'react';
import './ImportE2ERoomKeys.scss';

import cons from '../../../client/state/cons';
import { decryptMegolmKeyFile } from '../../../util/cryptE2ERoomKeys';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import CirclePlusIC from '../../../../public/res/ic/outlined/circle-plus.svg';

import { useStore } from '../../hooks/useStore';
import { useMatrixClient } from '../../hooks/useMatrixClient';

function ImportE2ERoomKeys() {
  const mx = useMatrixClient();
  const isMountStore = useStore();
  const [keyFile, setKeyFile] = useState(null);
  const [status, setStatus] = useState({
    isOngoing: false,
    msg: null,
    type: cons.status.PRE_FLIGHT,
  });
  const inputRef = useRef(null);
  const passwordRef = useRef(null);

  async function tryDecrypt(file, password) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (isMountStore.getItem()) {
        setStatus({
          isOngoing: true,
          msg: 'Decrypting file...',
          type: cons.status.IN_FLIGHT,
        });
      }

      const keys = await decryptMegolmKeyFile(arrayBuffer, password);
      if (isMountStore.getItem()) {
        setStatus({
          isOngoing: true,
          msg: 'Decrypting messages...',
          type: cons.status.IN_FLIGHT,
        });
      }
      await mx.importRoomKeys(JSON.parse(keys));
      if (isMountStore.getItem()) {
        setStatus({
          isOngoing: false,
          msg: 'Successfully imported all keys.',
          type: cons.status.SUCCESS,
        });
        inputRef.current.value = null;
        passwordRef.current.value = null;
      }
    } catch (e) {
      if (isMountStore.getItem()) {
        setStatus({
          isOngoing: false,
          msg: e.friendlyText || 'Failed to decrypt keys. Please try again.',
          type: cons.status.ERROR,
        });
      }
    }
  }

  const importE2ERoomKeys = () => {
    const password = passwordRef.current.value;
    if (password === '' || keyFile === null) return;
    if (status.isOngoing) return;

    tryDecrypt(keyFile, password);
  };

  const handleFileChange = (e) => {
    const file = e.target.files.item(0);
    passwordRef.current.value = '';
    setKeyFile(file);
    setStatus({
      isOngoing: false,
      msg: null,
      type: cons.status.PRE_FLIGHT,
    });
  };
  const removeImportKeysFile = () => {
    if (status.isOngoing) return;
    inputRef.current.value = null;
    passwordRef.current.value = null;
    setKeyFile(null);
    setStatus({
      isOngoing: false,
      msg: null,
      type: cons.status.PRE_FLIGHT,
    });
  };

  useEffect(() => {
    isMountStore.setItem(true);
    return () => {
      isMountStore.setItem(false);
    };
  }, []);

  return (
    <div className="import-e2e-room-keys">
      <input ref={inputRef} onChange={handleFileChange} style={{ display: 'none' }} type="file" />

      <form className="import-e2e-room-keys__form" onSubmit={(e) => { e.preventDefault(); importE2ERoomKeys(); }}>
        { keyFile !== null && (
          <div className="import-e2e-room-keys__file">
            <IconButton onClick={removeImportKeysFile} src={CirclePlusIC} tooltip="Remove file" />
            <Text>{keyFile.name}</Text>
          </div>
        )}
        {keyFile === null && <Button onClick={() => inputRef.current.click()}>Import keys</Button>}
        <Input forwardRef={passwordRef} type="password" placeholder="Password" required />
        <Button disabled={status.isOngoing} variant="primary" type="submit">Decrypt</Button>
      </form>
      { status.type === cons.status.IN_FLIGHT && (
        <div className="import-e2e-room-keys__process">
          <Spinner size="small" />
          <Text variant="b2">{status.msg}</Text>
        </div>
      )}
      {status.type === cons.status.SUCCESS && <Text className="import-e2e-room-keys__success" variant="b2">{status.msg}</Text>}
      {status.type === cons.status.ERROR && <Text className="import-e2e-room-keys__error" variant="b2">{status.msg}</Text>}
    </div>
  );
}

export default ImportE2ERoomKeys;
