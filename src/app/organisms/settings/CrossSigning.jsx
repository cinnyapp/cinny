import React from 'react';
import './CrossSigning.scss';
import { Formik } from 'formik';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { hasCrossSigningAccountData } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import SettingTile from '../../molecules/setting-tile/SettingTile';

function CrossSigningSetup() {
  const initialValues = { phrase: '', confirmPhrase: '' };

  const setup = (securityPhrase = undefined) => {
    const mx = initMatrix.matrixClient;
    const crossSigning = mx.getStoredCrossSigningForUser(mx.getUserId());

    if (!crossSigning) {
      // TODO: bootstrap crossSigning.
    }
    if (hasCrossSigningAccountData()) {
      // TODO: user is doing reset.
      // delete current cross signing keys
      // delete current message backup
    }

    // TODO: prompt user security key.
  };

  const validator = (values) => {
    const errors = {};
    const PHRASE_REGEX = /^([^\s]){8,127}$/;
    if (values.phrase.length > 0 && !PHRASE_REGEX.test(values.phrase)) {
      errors.phrase = 'Phrase must contain 8-127 characters with no space.';
    }
    if (values.confirmPhrase.length > 0 && values.confirmPhrase !== values.phrase) {
      errors.confirmPhrase = 'Phrase don\'t match.';
    }
    return errors;
  };

  const submitter = (values) => {
    setup(values.phrase);
  };

  return (
    <div className="cross-signing__setup">
      <div className="cross-signing__setup-entry">
        <Text>
          We will generate a Security Key, 
          which you can use to manage messages backup and session verification.
        </Text>
        <Button variant="primary" onClick={() => setup()}>Generate Key</Button>
      </div>
      <Text className="cross-signing__setup-divider">OR</Text>
      <Formik
        initialValues={initialValues}
        onSubmit={submitter}
        validate={validator}
      >
        {({
          values, errors, handleChange, handleSubmit,
        }) => (
          <form
            className="cross-signing__setup-entry"
            onSubmit={handleSubmit}
          >
            <Text>
              Alternatively you can also set a Security Phrase 
              so you don't have to remember long Security Key, 
              and optionally save the Key as backup.
            </Text>
            <Input name="phrase" value={values.phrase} onChange={handleChange} label="Security Phrase" type="password" required />
            {errors.phrase && <Text variant="b3" className="cross-signing__error">{errors.phrase}</Text>}
            <Input name="confirmPhrase" value={values.confirmPhrase} onChange={handleChange} label="Confirm Security Phrase" type="password" required />
            {errors.confirmPhrase && <Text variant="b3" className="cross-signing__error">{errors.confirmPhrase}</Text>}
            <Button variant="primary" type="submit">Set Phrase & Generate Key</Button>
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
