import React, { useState, useEffect, useRef } from 'react';
import './ExportE2ERoomKeys.scss';

import FileSaver from 'file-saver';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { encryptMegolmKeyFile } from '../../../util/cryptE2ERoomKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import { useStore } from '../../hooks/useStore';

import '../../i18n.jsx'
import { useTranslation } from 'react-i18next';

function ExportE2ERoomKeys() {
  const isMountStore = useStore();
  const [status, setStatus] = useState({
    isOngoing: false,
    msg: null,
    type: cons.status.PRE_FLIGHT,
  });
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const { t } = useTranslation();

  const exportE2ERoomKeys = async () => {
    const password = passwordRef.current.value;
    if (password !== confirmPasswordRef.current.value) {
      setStatus({
        isOngoing: false,
        msg: t("Molecules.ExportE2ERoomKeys.password_does_not_match"),
        type: cons.status.ERROR,
      });
      return;
    }
    setStatus({
      isOngoing: true,
      msg: t("Molecules.ExportE2ERoomKeys.getting_keys"),
      type: cons.status.IN_FLIGHT,
    });
    try {
      const keys = await initMatrix.matrixClient.exportRoomKeys();
      if (isMountStore.getItem()) {
        setStatus({
          isOngoing: true,
          msg: t("Molecules.ExportE2ERoomKeys.encrypting_keys"),
          type: cons.status.IN_FLIGHT,
        });
      }
      const encKeys = await encryptMegolmKeyFile(JSON.stringify(keys), password);
      const blob = new Blob([encKeys], {
        type: 'text/plain;charset=us-ascii',
      });
      FileSaver.saveAs(blob, 'cinny-keys.txt');
      if (isMountStore.getItem()) {
        setStatus({
          isOngoing: false,
          msg: t("Molecules.ExportE2ERoomKeys.export_success"),
          type: cons.status.SUCCESS,
        });
      }
    } catch (e) {
      if (isMountStore.getItem()) {
        setStatus({
          isOngoing: false,
          msg: e.friendlyText || t("Molecules.ExportE2ERoomKeys.export_failed"),
          type: cons.status.ERROR,
        });
      }
    }
  };

  useEffect(() => {
    isMountStore.setItem(true);
    return () => {
      isMountStore.setItem(false);
    };
  }, []);

  return (
    <div className="export-e2e-room-keys">
      <form className="export-e2e-room-keys__form" onSubmit={(e) => { e.preventDefault(); exportE2ERoomKeys(); }}>
        <Input forwardRef={passwordRef} type="password" placeholder="Password" required />
        <Input forwardRef={confirmPasswordRef} type="password" placeholder="Confirm password" required />
        <Button disabled={status.isOngoing} variant="primary" type="submit">{t("Molecules.ExportE2ERoomKeys.button_text")}</Button>
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

export default ExportE2ERoomKeys;
