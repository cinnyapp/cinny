import React, { useState } from 'react';
import './CrossSigning.scss';
import FileSaver from 'file-saver';
import { Formik } from 'formik';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { hasCrossSigningAccountData } from '../../../util/matrixUtil';
import { copyToClipboard } from '../../../util/common';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import SettingTile from '../../molecules/setting-tile/SettingTile';

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
      <Text className="cross-signing__key-text">
        {key.encodedPrivateKey}
      </Text>
      <div className="cross-signing__key-btn">
        <Button variant="primary" onClick={() => copyKey(key)}>Copy</Button>
        <Button onClick={() => downloadKey(key)}>Download</Button>
      </div>
    </div>
  );

  // Download automatically.
  downloadKey();

  openReusableDialog(
    <Text variant="s1" weight="medium">Security Key</Text>,
    () => renderSecurityKey(),
  );
};

function CrossSigningSetup() {
  const initialValues = { phrase: '', confirmPhrase: '' };
  const [genWithPhrase, setGenWithPhrase] = useState(undefined);

  const setup = async (securityPhrase = undefined) => {
    const mx = initMatrix.matrixClient;
    setGenWithPhrase(typeof securityPhrase === 'string');
    const recoveryKey = await mx.createRecoveryKeyFromPassphrase(securityPhrase);

    const bootstrapSSOpts = {
      createSecretStorageKey: async () => recoveryKey,
      setupNewKeyBackup: true,
      setupNewSecretStorage: true,
    };

    await mx.bootstrapSecretStorage(bootstrapSSOpts);

    securityKeyDialog(recoveryKey);
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
          We will generate a Security Key, 
          which you can use to manage messages backup and session verification.
        </Text>
        {genWithPhrase !== false && <Button variant="primary" onClick={() => setup()} disabled={genWithPhrase !== undefined}>Generate Key</Button>}
        {genWithPhrase === false && <Spinner size="small" />}
      </div>
      <Text className="cross-signing__setup-divider">OR</Text>
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
              Alternatively you can also set a Security Phrase 
              so you don't have to remember long Security Key, 
              and optionally save the Key as backup.
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
            {errors.phrase && <Text variant="b3" className="cross-signing__error">{errors.phrase}</Text>}
            <Input
              name="confirmPhrase"
              value={values.confirmPhrase}
              onChange={handleChange}
              label="Confirm Security Phrase"
              type="password"
              required
              disabled={genWithPhrase !== undefined}
            />
            {errors.confirmPhrase && <Text variant="b3" className="cross-signing__error">{errors.confirmPhrase}</Text>}
            {genWithPhrase !== true && <Button variant="primary" type="submit" disabled={genWithPhrase !== undefined}>Set Phrase & Generate Key</Button>}
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
  return (
    <div className="cross-signing__reset">
      <Text variant="h1">{twemojify('✋🧑‍🚒🤚')}</Text>
      <Text weight="medium">Resetting cross-signing keys is permanent.</Text>
      <Text>
        Anyone you have verified with will see security alerts and your message backup will lost. 
        You almost certainly do not want to do this, 
        unless you have lost Security Key or Phrase and every session you can cross-sign from.
      </Text>
      <Button variant="danger" onClick={setupDialog}>Reset</Button>
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
  return (
    <SettingTile
      title="Cross signing"
      content={<Text variant="b3">Setup to verify and keep track of all your sessions. Also required to backup encrypted message.</Text>}
      options={(
        hasCrossSigningAccountData()
          ? <Button variant="danger" onClick={resetDialog}>Reset</Button>
          : <Button variant="primary" onClick={setupDialog}>Setup</Button>
      )}
    />
  );
}

export default CrossSignin;
