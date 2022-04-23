/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './KeyBackup.scss';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { getDefaultSSKey } from '../../../util/matrixUtil';
import { storePrivateKey, hasPrivateKey, getPrivateKey } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import InfoCard from '../../atoms/card/InfoCard';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import SecretStorageAccess from './SecretStorageAccess';

import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';
import DownloadIC from '../../../../public/res/ic/outlined/download.svg';

import { useStore } from '../../hooks/useStore';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';

function CreateKeyBackupDialog({ keyData }) {
  const [done, setDone] = useState(false);
  const mx = initMatrix.matrixClient;
  const mountStore = useStore();

  const doBackup = async () => {
    setDone(false);
    let info;

    try {
      info = await mx.prepareKeyBackupVersion(
        null,
        { secureSecretStorage: true },
      );
      info = await mx.createKeyBackupVersion(info);
      await mx.scheduleAllGroupSessionsForBackup();
      if (!mountStore.getItem()) return;
      setDone(true);
    } catch (e) {
      await mx.deleteKeyBackupVersion(info.version);
      if (!mountStore.getItem()) return;
      setDone(null);
    }
  };

  useEffect(() => {
    mountStore.setItem(true);
    doBackup();
  }, []);

  return (
    <div className="key-backup__create">
      {done === false && (
        <div>
          <Spinner size="small" />
          <Text>Creating backup...</Text>
        </div>
      )}
      {done === true && (
        <>
          <Text variant="h1">{twemojify('✅')}</Text>
          <Text>Successfully created backup</Text>
        </>
      )}
      {done === null && (
        <>
          <Text>Failed to create backup</Text>
          <Button onClick={doBackup}>Retry</Button>
        </>
      )}
    </div>
  );
}
CreateKeyBackupDialog.propTypes = {
  keyData: PropTypes.shape({}).isRequired,
};

function RestoreKeyBackupDialog({ keyData, backupInfo }) {
  const [done, setDone] = useState(false);
  const mx = initMatrix.matrixClient;
  const mountStore = useStore();

  const restoreBackup = async () => {
    setDone(false);

    try {
      await mx.restoreKeyBackupWithSecretStorage(
        backupInfo,
        undefined,
        undefined,
      );
      if (!mountStore.getItem()) return;
      setDone(true);
    } catch (e) {
      if (!mountStore.getItem()) return;
      setDone(null);
    }
  };

  useEffect(() => {
    mountStore.setItem(true);
    restoreBackup();
  }, []);

  return (
    <div className="key-backup__restore">
      {done === false && (
        <div>
          <Spinner size="small" />
          <Text>Restoring backup...</Text>
        </div>
      )}
      {done === true && (
        <>
          <Text variant="h1">{twemojify('✅')}</Text>
          <Text>Successfully restored backup</Text>
        </>
      )}
      {done === null && (
        <>
          <Text>Failed to restore backup</Text>
          <Button onClick={restoreBackup}>Retry</Button>
        </>
      )}
    </div>
  );
}
RestoreKeyBackupDialog.propTypes = {
  keyData: PropTypes.shape({}).isRequired,
  backupInfo: PropTypes.shape({}).isRequired,
};

function DeleteKeyBackupDialog({ version, requestClose }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const mx = initMatrix.matrixClient;
  const mountStore = useStore();
  mountStore.setItem(true);

  const deleteBackup = async () => {
    setIsDeleting(true);
    try {
      await mx.deleteKeyBackupVersion(version);
      if (!mountStore.getItem()) return;
      requestClose(true);
    } catch {
      if (!mountStore.getItem()) return;
      setIsDeleting(false);
    }
  };

  return (
    <div className="key-backup__delete">
      <Text variant="h1">{twemojify('🗑')}</Text>
      <Text weight="medium">Deleting key backup is permanent.</Text>
      <Text>All encrypted messages keys stored on server will be deleted.</Text>
      {
        isDeleting
          ? <Spinner size="small" />
          : <Button variant="danger" onClick={deleteBackup}>Delete</Button>
      }
    </div>
  );
}
DeleteKeyBackupDialog.propTypes = {
  version: PropTypes.string.isRequired,
  requestClose: PropTypes.func.isRequired,
};

function KeyBackup() {
  const mx = initMatrix.matrixClient;
  const isCSEnabled = useCrossSigningStatus();
  const [keyBackup, setKeyBackup] = useState(undefined);
  const mountStore = useStore();

  const fetchKeyBackupVersion = async () => {
    const info = await mx.getKeyBackupVersion();
    if (!mountStore.getItem()) return;
    setKeyBackup(info);
  };

  useEffect(() => {
    mountStore.setItem(true);
    fetchKeyBackupVersion();

    const handleAccountData = (event) => {
      if (event.getType() === 'm.megolm_backup.v1') {
        fetchKeyBackupVersion();
      }
    };

    mx.on('accountData', handleAccountData);
    return () => {
      mx.removeListener('accountData', handleAccountData);
    };
  }, []);

  const accessSecretStorage = (title, onComplete) => {
    const defaultSSKey = getDefaultSSKey();
    if (hasPrivateKey(defaultSSKey)) {
      onComplete({ decodedKey: getPrivateKey(defaultSSKey) });
      return;
    }
    const handleComplete = (keyData) => {
      storePrivateKey(keyData.keyId, keyData.decodedKey);
      onComplete(keyData);
    };

    openReusableDialog(
      <Text variant="s1" weight="medium">{title}</Text>,
      () => <SecretStorageAccess onComplete={handleComplete} />,
    );
  };

  const openCreateKeyBackup = () => {
    const createKeyBackup = (keyData) => {
      openReusableDialog(
        <Text variant="s1" weight="medium">Create Key Backup</Text>,
        () => <CreateKeyBackupDialog keyData={keyData} />,
        () => fetchKeyBackupVersion(),
      );
    };
    accessSecretStorage('Create Key Backup', createKeyBackup);
  };

  const openRestoreKeyBackup = () => {
    const restoreKeyBackup = (keyData) => {
      openReusableDialog(
        <Text variant="s1" weight="medium">Restore Key Backup</Text>,
        () => <RestoreKeyBackupDialog keyData={keyData} backupInfo={keyBackup} />,
      );
    };
    accessSecretStorage('Restore Key Backup', restoreKeyBackup);
  };

  const openDeleteKeyBackup = () => openReusableDialog(
    <Text variant="s1" weight="medium">Delete Key Backup</Text>,
    (requestClose) => (
      <DeleteKeyBackupDialog
        version={keyBackup.version}
        requestClose={(isDone) => {
          if (isDone) setKeyBackup(null);
          requestClose();
        }}
      />
    ),
  );

  const renderOptions = () => {
    if (keyBackup === undefined) return <Spinner size="small" />;
    if (keyBackup === null) return <Button variant="primary" onClick={openCreateKeyBackup}>Create Backup</Button>;
    return (
      <>
        <IconButton src={DownloadIC} variant="positive" onClick={openRestoreKeyBackup} tooltip="Restore backup" />
        <IconButton src={BinIC} onClick={openDeleteKeyBackup} tooltip="Delete backup" />
      </>
    );
  };

  return (
    <SettingTile
      title="Encrypted messages backup"
      content={(
        <>
          <Text variant="b3">Online backup your encrypted messages keys with your account data in case you lose access to your sessions. Your keys will be secured with a unique Security Key.</Text>
          {!isCSEnabled && (
            <InfoCard
              style={{ marginTop: 'var(--sp-ultra-tight)' }}
              rounded
              variant="caution"
              iconSrc={InfoIC}
              title="Setup cross signing to backup your encrypted messages."
            />
          )}
        </>
      )}
      options={isCSEnabled ? renderOptions() : null}
    />
  );
}

export default KeyBackup;
