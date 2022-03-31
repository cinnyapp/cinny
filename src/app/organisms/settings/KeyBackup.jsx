import React, { useState, useEffect } from 'react';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import InfoCard from '../../atoms/card/InfoCard';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';
import DownloadIC from '../../../../public/res/ic/outlined/download.svg';

import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';

function KeyBackup() {
  const mx = initMatrix.matrixClient;
  const isCSEnabled = useCrossSigningStatus();
  const [keyBackup, setKeyBackup] = useState(undefined);

  useEffect(() => {
    let isMounted = true;
    mx.getKeyBackupVersion().then((info) => {
      if (!isMounted) return;
      setKeyBackup(info);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const renderOptions = () => {
    if (keyBackup === undefined) return <Spinner size="small" />;
    if (keyBackup === null) return <Button variant="primary" onClick={() => alert('create')}>Create Backup</Button>;
    return (
      <>
        <IconButton src={DownloadIC} variant="positive" onClick={() => alert('restore')} tooltip="Restore backup" />
        <IconButton src={BinIC} onClick={() => alert('delete')} tooltip="Delete backup" />
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
