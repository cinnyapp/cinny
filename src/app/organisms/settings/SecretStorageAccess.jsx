import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './SecretStorageAccess.scss';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import { useStore } from '../../hooks/useStore';

function SecretStorageAccess({ onComplete }) {
  const mx = initMatrix.matrixClient;
  const sSKeyId = mx.getAccountData('m.secret_storage.default_key').getContent().key;
  const sSKeyInfo = mx.getAccountData(`m.secret_storage.key.${sSKeyId}`).getContent();
  const isPassphrase = !!sSKeyInfo.passphrase;
  const [withPhrase, setWithPhrase] = useState(isPassphrase);
  const [process, setProcess] = useState(false);
  const [error, setError] = useState(null);
  const mountStore = useStore();
  mountStore.setItem(true);

  const toggleWithPhrase = () => setWithPhrase(!withPhrase);

  const processInput = async ({ key, phrase }) => {
    setProcess(true);
    try {
      const { salt, iterations } = sSKeyInfo.passphrase;
      const decodedKey = key
        ? mx.keyBackupKeyFromRecoveryKey(key)
        : await deriveKey(phrase, salt, iterations);
      const isCorrect = await mx.checkSecretStorageKey(decodedKey, sSKeyInfo);

      if (!mountStore.getItem()) return;
      if (!isCorrect) {
        setError(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
        setProcess(false);
        return;
      }
      onComplete({ key, phrase, decodedKey });
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

export default SecretStorageAccess;
