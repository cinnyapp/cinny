import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './SecretStorageAccess.scss';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { getDefaultSSKey, getSSKeyInfo } from '../../../util/matrixUtil';
import { storePrivateKey, hasPrivateKey, getPrivateKey } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import { useStore } from '../../hooks/useStore';

function SecretStorageAccess({ onComplete }) {
  const mx = initMatrix.matrixClient;
  const sSKeyId = getDefaultSSKey();
  const sSKeyInfo = getSSKeyInfo(sSKeyId);
  const isPassphrase = !!sSKeyInfo.passphrase;
  const [withPhrase, setWithPhrase] = useState(isPassphrase);
  const [process, setProcess] = useState(false);
  const [error, setError] = useState(null);
  const mountStore = useStore();
  const { t } = useTranslation();

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
        setError(t(key ? 'Organisms.SecretStorageAccess.incorrect_security_key' : 'Organisms.SecretStorageAccess.incorrect_security_phrase'));
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
      setError(t(key ? 'Organisms.SecretStorageAccess.incorrect_security_key' : 'Organisms.SecretStorageAccess.incorrect_security_phrase'));
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
          label={withPhrase ? t('Organisms.SecretStorageAccess.security_phrase') : t('Organisms.SecretStorageAccess.security_key')}
          type="password"
          onChange={handleChange}
          required
        />
        {error && <Text variant="b3">{error}</Text>}
        {!process && (
          <div className="secret-storage-access__btn">
            <Button variant="primary" type="submit">{t('common.continue')}</Button>
            {isPassphrase && <Button onClick={toggleWithPhrase}>{t(withPhrase ? 'Organisms.SecretStorageAccess.use_security_key' : 'Organisms.SecretStorageAccess.use_security_phrase')}</Button>}
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
 * @param {string} title Title of secret storage access dialog
 * @returns {Promise<keyData | null>} resolve to keyData or null
 */
export const accessSecretStorage = (title) => new Promise((resolve) => {
  let isCompleted = false;
  const defaultSSKey = getDefaultSSKey();
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