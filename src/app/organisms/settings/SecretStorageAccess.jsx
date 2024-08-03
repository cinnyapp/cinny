import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './SecretStorageAccess.scss';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';

import { openReusableDialog } from '../../../client/action/navigation';
import { getDefaultSSKey, getSSKeyInfo } from '../../../util/matrixUtil';
import { storePrivateKey, hasPrivateKey, getPrivateKey } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import { useStore } from '../../hooks/useStore';
import { useMatrixClient } from '../../hooks/useMatrixClient';

function SecretStorageAccess({ onComplete }) {
  const mx = useMatrixClient();
  const sSKeyId = getDefaultSSKey(mx);
  const sSKeyInfo = getSSKeyInfo(mx, sSKeyId);
  const isPassphrase = !!sSKeyInfo.passphrase;
  const [withPhrase, setWithPhrase] = useState(isPassphrase);
  const [process, setProcess] = useState(false);
  const [error, setError] = useState(null);
  const mountStore = useStore();

  const toggleWithPhrase = () => setWithPhrase(!withPhrase);

  const processInput = async ({ key, phrase }) => {
    mountStore.setItem(true);
    setProcess(true);
    try {
      const { salt, iterations } = sSKeyInfo.passphrase || {};
      const privateKey = key
        ? mx.keyBackupKeyFromRecoveryKey(key)
        : await deriveKey(phrase, salt, iterations);
      const isCorrect = await mx.checkSecretStorageKey(privateKey, sSKeyInfo);

      if (!mountStore.getItem()) return;
      if (!isCorrect) {
        setError(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
        setProcess(false);
        return;
      }
      onComplete({
        keyId: sSKeyId,
        key,
        phrase,
        privateKey,
      });
    } catch (e) {
      if (!mountStore.getItem()) return;
      setError(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
      setProcess(false);
    }
  };

  const handleForm = async (e) => {
    e.preventDefault();
    const password = e.target.password.value;
    if (password.trim() === '') return;
    const data = {};
    if (withPhrase) data.phrase = password;
    else data.key = password;
    processInput(data);
  };

  const handleChange = () => {
    setError(null);
    setProcess(false);
  };

  return (
    <div className="secret-storage-access">
      <form onSubmit={handleForm}>
        <Input
          name="password"
          label={`Security ${withPhrase ? 'Phrase' : 'Key'}`}
          type="password"
          onChange={handleChange}
          required
        />
        {error && <Text variant="b3">{error}</Text>}
        {!process && (
          <div className="secret-storage-access__btn">
            <Button variant="primary" type="submit">Continue</Button>
            {isPassphrase && <Button onClick={toggleWithPhrase}>{`Use Security ${withPhrase ? 'Key' : 'Phrase'}`}</Button>}
          </div>
        )}
      </form>
      {process && <Spinner size="small" />}
    </div>
  );
}
SecretStorageAccess.propTypes = {
  onComplete: PropTypes.func.isRequired,
};

/**
 * @param {MatrixClient} mx Matrix client
 * @param {string} title Title of secret storage access dialog
 * @returns {Promise<keyData | null>} resolve to keyData or null
 */
export const accessSecretStorage = (mx, title) => new Promise((resolve) => {
  let isCompleted = false;
  const defaultSSKey = getDefaultSSKey(mx);
  if (hasPrivateKey(defaultSSKey)) {
    resolve({ keyId: defaultSSKey, privateKey: getPrivateKey(defaultSSKey) });
    return;
  }
  const handleComplete = (keyData) => {
    isCompleted = true;
    storePrivateKey(keyData.keyId, keyData.privateKey);
    resolve(keyData);
  };

  openReusableDialog(
    <Text variant="s1" weight="medium">{title}</Text>,
    (requestClose) => (
      <SecretStorageAccess
        onComplete={(keyData) => {
          handleComplete(keyData);
          requestClose(requestClose);
        }}
      />
    ),
    () => {
      if (!isCompleted) resolve(null);
    },
  );
});

export default SecretStorageAccess;
