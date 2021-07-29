import React, { useState, useEffect, useRef } from 'react';
import './ImportE2ERoomKeys.scss';
import EventEmitter from 'events';

import initMatrix from '../../../client/initMatrix';
import decryptMegolmKeyFile from '../../../util/decryptE2ERoomKeys';

import { Text } from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import CirclePlusIC from '../../../../public/res/ic/outlined/circle-plus.svg';

const viewEvent = new EventEmitter();

async function tryDecrypt(file, password) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    viewEvent.emit('importing', true);
    viewEvent.emit('status', 'Decrypting file...');
    const keys = await decryptMegolmKeyFile(arrayBuffer, password);

    viewEvent.emit('status', 'Decrypting messages...');
    await initMatrix.matrixClient.importRoomKeys(JSON.parse(keys));

    viewEvent.emit('status', null);
    viewEvent.emit('importing', false);
  } catch (e) {
    viewEvent.emit('status', e.friendlyText || 'Something went wrong!');
    viewEvent.emit('importing', false);
  }
}

function ImportE2ERoomKeys() {
  const [keyFile, setKeyFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    const handleIsImporting = (isImp) => setIsImporting(isImp);
    const handleStatus = (msg) => setStatus(msg);
    viewEvent.on('importing', handleIsImporting);
    viewEvent.on('status', handleStatus);

    return () => {
      viewEvent.removeListener('importing', handleIsImporting);
      viewEvent.removeListener('status', handleStatus);
    };
  }, []);

  function importE2ERoomKeys() {
    const password = passwordRef.current.value;
    if (password === '' || keyFile === null) return;
    if (isImporting) return;

    tryDecrypt(keyFile, password);
  }

  function handleFileChange(e) {
    const file = e.target.files.item(0);
    passwordRef.current.value = '';
    setKeyFile(file);
    setStatus(null);
  }
  function removeImportKeysFile() {
    inputRef.current.value = null;
    passwordRef.current.value = null;
    setKeyFile(null);
    setStatus(null);
  }

  useEffect(() => {
    if (!isImporting && status === null) {
      removeImportKeysFile();
    }
  }, [isImporting, status]);

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
        <Input forwardRef={passwordRef} type="password" placeholder="password" required />
        <Button disabled={isImporting} variant="primary" type="submit">Decrypt</Button>
      </form>
      { isImporting && status !== null && (
        <div className="import-e2e-room-keys__process">
          <Spinner size="small" />
          <Text variant="b2">{status}</Text>
        </div>
      )}
      {!isImporting && status !== null && <Text className="import-e2e-room-keys__error" variant="b2">{status}</Text>}
    </div>
  );
}

export default ImportE2ERoomKeys;
