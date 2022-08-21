/* eslint-disable react/jsx-one-expression-per-line */
import React, { useState } from 'react';
import './CrossSigning.scss';
import FileSaver from 'file-saver';
import { Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { copyToClipboard } from '../../../util/common';
import { clearSecretStorageKeys } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import { authRequest } from './AuthRequest';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';

import '../../i18n';

function CrossSigningSetup() {
  const { t } = useTranslation();

  const initialValues = { phrase: '', confirmPhrase: '' };
  const [genWithPhrase, setGenWithPhrase] = useState(undefined);

  const failedDialog = () => {
    const renderFailure = (requestClose) => (
      <div className="cross-signing__failure">
        <Text variant="h1">{twemojify('❌')}</Text>
        <Text weight="medium">{t('Organisms.CrossSigning.setup_failed')}</Text>
        <Button onClick={requestClose}>{t('common.close')}</Button>
      </div>
    );

    openReusableDialog(
      <Text variant="s1" weight="medium">{t('Organisms.CrossSigning.setup')}</Text>,
      renderFailure,
    );
  };

  const securityKeyDialog = (key) => {
    const downloadKey = () => {
      const blob = new Blob([key.encodedPrivateKey], {
        type: 'text/plain;charset=us-ascii',
      });
      FileSaver.saveAs(blob, 'security-key.txt');
    };
    const copyKey = () => {
      copyToClipboard(key.encodedPrivateKey);
    };

    const renderSecurityKey = () => (
      <div className="cross-signing__key">
        <Text weight="medium">{t('Organisms.CrossSigning.save_security_key_message')}</Text>
        <Text className="cross-signing__key-text">
          {key.encodedPrivateKey}
        </Text>
        <div className="cross-signing__key-btn">
          <Button variant="primary" onClick={() => copyKey(key)}>{t('common.copy')}</Button>
          <Button onClick={() => downloadKey(key)}>{t('common.download')}</Button>
        </div>
      </div>
    );

    // Download automatically.
    downloadKey();

    openReusableDialog(
      <Text variant="s1" weight="medium">{t('Organisms.CrossSigning.security_key_dialog_title')}</Text>,
      () => renderSecurityKey(),
    );
  };

  const setup = async (securityPhrase = undefined) => {
    const mx = initMatrix.matrixClient;
    setGenWithPhrase(typeof securityPhrase === 'string');
    const recoveryKey = await mx.createRecoveryKeyFromPassphrase(securityPhrase);
    clearSecretStorageKeys();

    await mx.bootstrapSecretStorage({
      createSecretStorageKey: async () => recoveryKey,
      setupNewKeyBackup: true,
      setupNewSecretStorage: true,
    });

    const authUploadDeviceSigningKeys = async (makeRequest) => {
      const isDone = await authRequest('Setup cross signing', async (auth) => {
        await makeRequest(auth);
      });
      setTimeout(() => {
        if (isDone) securityKeyDialog(recoveryKey);
        else failedDialog();
      });
    };

    await mx.bootstrapCrossSigning({
      authUploadDeviceSigningKeys,
      setupNewCrossSigning: true,
    });
  };

  const validator = (values) => {
    const errors = {};
    if (values.phrase === '12345678') {
      errors.phrase = 'How about 87654321 ?';
    }
    if (values.phrase === '87654321') {
      errors.phrase = 'Your are playing with 🔥';
    }
    const PHRASE_REGEX = /^([^\s]){8,127}$/;
    if (values.phrase.length > 0 && !PHRASE_REGEX.test(values.phrase)) {
      errors.phrase = 'Phrase must contain 8-127 characters with no space.';
    }
    if (values.confirmPhrase.length > 0 && values.confirmPhrase !== values.phrase) {
      errors.confirmPhrase = 'Phrase don\'t match.';
    }
    return errors;
  };

  return (
    <div className="cross-signing__setup">
      <div className="cross-signing__setup-entry">
        <Text>
          {t('Organisms.CrossSigning.security_key_generation_message')}
        </Text>
        {genWithPhrase !== false && <Button variant="primary" onClick={() => setup()} disabled={genWithPhrase !== undefined}>{t('Organisms.CrossSigning.security_key_generation_button')}</Button>}
        {genWithPhrase === false && <Spinner size="small" />}
      </div>
      <Text className="cross-signing__setup-divider">{t('common.or')}</Text>
      <Formik
        initialValues={initialValues}
        onSubmit={(values) => setup(values.phrase)}
        validate={validator}
      >
        {({
          values, errors, handleChange, handleSubmit,
        }) => (
          <form
            className="cross-signing__setup-entry"
            onSubmit={handleSubmit}
            disabled={genWithPhrase !== undefined}
          >
            <Text>
              {t('Organisms.CrossSigning.security_phrase_message')}
            </Text>
            <Input
              name="phrase"
              value={values.phrase}
              onChange={handleChange}
              label={t('Organisms.CrossSigning.security_phrase_label')}
              type="password"
              required
              disabled={genWithPhrase !== undefined}
            />
            {errors.phrase && <Text variant="b3" className="cross-signing__error">{errors.phrase}</Text>}
            <Input
              name="confirmPhrase"
              value={values.confirmPhrase}
              onChange={handleChange}
              label={t('Organisms.CrossSigning.security_phrase_confirm_label')}
              type="password"
              required
              disabled={genWithPhrase !== undefined}
            />
            {errors.confirmPhrase && <Text variant="b3" className="cross-signing__error">{errors.confirmPhrase}</Text>}
            {genWithPhrase !== true && <Button variant="primary" type="submit" disabled={genWithPhrase !== undefined}>{t('Organisms.CrossSigning.security_phrase_set_button')}</Button>}
            {genWithPhrase === true && <Spinner size="small" />}
          </form>
        )}
      </Formik>
    </div>
  );
}

const setupDialog = () => {
  openReusableDialog(
    <Text variant="s1" weight="medium">Setup cross signing</Text>,
    () => <CrossSigningSetup />,
  );
};

function CrossSigningReset() {
  const { t } = useTranslation();
  return (
    <div className="cross-signing__reset">
      <Text variant="h1">{twemojify('✋🧑‍🚒🤚')}</Text>
      <Text weight="medium">{t('Organisms.CrossSigning.reset_keys_subtitle')}</Text>
      <Text>
        {t('Organisms.CrossSigning.reset_keys_message')}
      </Text>
      <Button variant="danger" onClick={setupDialog}>{t('common.reset')}</Button>
    </div>
  );
}

const resetDialog = () => {
  openReusableDialog(
    <Text variant="s1" weight="medium">Reset cross signing</Text>,
    () => <CrossSigningReset />,
  );
};

function CrossSignin() {
  const { t } = useTranslation();
  const isCSEnabled = useCrossSigningStatus();
  return (
    <SettingTile
      title={t('Organisms.CrossSigning.title')}
      content={<Text variant="b3">{t('Organisms.CrossSigning.setup_message')}</Text>}
      options={(
        isCSEnabled
          ? <Button variant="danger" onClick={resetDialog}>{t('common.reset')}</Button>
          : <Button variant="primary" onClick={setupDialog}>{t('common.setup')}</Button>
      )}
    />
  );
}

export default CrossSignin;
