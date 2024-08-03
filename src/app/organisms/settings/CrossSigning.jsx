/* eslint-disable react/jsx-one-expression-per-line */
import React, { useState } from 'react';
import './CrossSigning.scss';
import FileSaver from 'file-saver';
import { Formik } from 'formik';

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
import { useMatrixClient } from '../../hooks/useMatrixClient';

const failedDialog = () => {
  const renderFailure = (requestClose) => (
    <div className="cross-signing__failure">
      <Text variant="h1">❌</Text>
      <Text weight="medium">Failed to setup cross signing. Please try again.</Text>
      <Button onClick={requestClose}>Close</Button>
    </div>
  );

  openReusableDialog(
    <Text variant="s1" weight="medium">
      Setup cross signing
    </Text>,
    renderFailure
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
      <Text weight="medium">Please save this security key somewhere safe.</Text>
      <Text className="cross-signing__key-text">{key.encodedPrivateKey}</Text>
      <div className="cross-signing__key-btn">
        <Button variant="primary" onClick={() => copyKey(key)}>
          Copy
        </Button>
        <Button onClick={() => downloadKey(key)}>Download</Button>
      </div>
    </div>
  );

  // Download automatically.
  downloadKey();

  openReusableDialog(
    <Text variant="s1" weight="medium">
      Security Key
    </Text>,
    () => renderSecurityKey()
  );
};

function CrossSigningSetup() {
  const initialValues = { phrase: '', confirmPhrase: '' };
  const [genWithPhrase, setGenWithPhrase] = useState(undefined);
  const mx = useMatrixClient();

  const setup = async (securityPhrase = undefined) => {
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
      errors.confirmPhrase = "Phrase don't match.";
    }
    return errors;
  };

  return (
    <div className="cross-signing__setup">
      <div className="cross-signing__setup-entry">
        <Text>
          We will generate a <b>Security Key</b>, which you can use to manage messages backup and
          session verification.
        </Text>
        {genWithPhrase !== false && (
          <Button variant="primary" onClick={() => setup()} disabled={genWithPhrase !== undefined}>
            Generate Key
          </Button>
        )}
        {genWithPhrase === false && <Spinner size="small" />}
      </div>
      <Text className="cross-signing__setup-divider">OR</Text>
      <Formik
        initialValues={initialValues}
        onSubmit={(values) => setup(values.phrase)}
        validate={validator}
      >
        {({ values, errors, handleChange, handleSubmit }) => (
          <form
            className="cross-signing__setup-entry"
            onSubmit={handleSubmit}
            disabled={genWithPhrase !== undefined}
          >
            <Text>
              Alternatively you can also set a <b>Security Phrase </b>
              so you don't have to remember long Security Key, and optionally save the Key as
              backup.
            </Text>
            <Input
              name="phrase"
              value={values.phrase}
              onChange={handleChange}
              label="Security Phrase"
              type="password"
              required
              disabled={genWithPhrase !== undefined}
            />
            {errors.phrase && (
              <Text variant="b3" className="cross-signing__error">
                {errors.phrase}
              </Text>
            )}
            <Input
              name="confirmPhrase"
              value={values.confirmPhrase}
              onChange={handleChange}
              label="Confirm Security Phrase"
              type="password"
              required
              disabled={genWithPhrase !== undefined}
            />
            {errors.confirmPhrase && (
              <Text variant="b3" className="cross-signing__error">
                {errors.confirmPhrase}
              </Text>
            )}
            {genWithPhrase !== true && (
              <Button variant="primary" type="submit" disabled={genWithPhrase !== undefined}>
                Set Phrase & Generate Key
              </Button>
            )}
            {genWithPhrase === true && <Spinner size="small" />}
          </form>
        )}
      </Formik>
    </div>
  );
}

const setupDialog = () => {
  openReusableDialog(
    <Text variant="s1" weight="medium">
      Setup cross signing
    </Text>,
    () => <CrossSigningSetup />
  );
};

function CrossSigningReset() {
  return (
    <div className="cross-signing__reset">
      <Text variant="h1">✋🧑‍🚒🤚</Text>
      <Text weight="medium">Resetting cross-signing keys is permanent.</Text>
      <Text>
        Anyone you have verified with will see security alerts and your message backup will be lost.
        You almost certainly do not want to do this, unless you have lost <b>Security Key</b> or{' '}
        <b>Phrase</b> and every session you can cross-sign from.
      </Text>
      <Button variant="danger" onClick={setupDialog}>
        Reset
      </Button>
    </div>
  );
}

const resetDialog = () => {
  openReusableDialog(
    <Text variant="s1" weight="medium">
      Reset cross signing
    </Text>,
    () => <CrossSigningReset />
  );
};

function CrossSignin() {
  const isCSEnabled = useCrossSigningStatus();
  return (
    <SettingTile
      title="Cross signing"
      content={
        <Text variant="b3">
          Setup to verify and keep track of all your sessions. Also required to backup encrypted
          message.
        </Text>
      }
      options={
        isCSEnabled ? (
          <Button variant="danger" onClick={resetDialog}>
            Reset
          </Button>
        ) : (
          <Button variant="primary" onClick={setupDialog}>
            Setup
          </Button>
        )
      }
    />
  );
}

export default CrossSignin;
