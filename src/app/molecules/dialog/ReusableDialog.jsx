import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import cons from '../../../client/state/cons';

import navigation from '../../../client/state/navigation';
import IconButton from '../../atoms/button/IconButton';
import Dialog from './Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import '../../i18n';

function ReusableDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  const { t } = useTranslation();

  useEffect(() => {
    const handleOpen = (title, render, afterClose) => {
      setIsOpen(true);
      setData({ title, render, afterClose });
    };
    navigation.on(cons.events.navigation.REUSABLE_DIALOG_OPENED, handleOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.REUSABLE_DIALOG_OPENED, handleOpen);
    };
  }, []);

  const handleAfterClose = () => {
    data.afterClose?.();
    setData(null);
  };

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog
      isOpen={isOpen}
      title={data?.title || ''}
      onAfterClose={handleAfterClose}
      onRequestClose={handleRequestClose}
      contentOptions={<IconButton src={CrossIC} onClick={handleRequestClose} tooltip={t('Molecules.ReusableDialog.close_tooltip')} />}
      invisibleScroll
    >
      {data?.render(handleRequestClose) || <div />}
    </Dialog>
  );
}

export default ReusableDialog;
