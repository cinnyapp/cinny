import initMatrix from '../client/initMatrix';
import { clearSecretStorageKeys, storePrivateKey } from '../client/state/secretStorageKeys';
import { authRequest } from '../app/organisms/settings/AuthRequest';
import { getDefaultSSKey, getSSKeyInfo } from '../util/matrixUtil';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';


function hasCrossSigningAccountData() {
  const mx = initMatrix.matrixClient;
  const masterKeyData = mx.getAccountData('m.cross_signing.master');
  return !!masterKeyData;
}

async function setupCrossSigningWithPassphrase(passphrase) {
  if (hasCrossSigningAccountData())
    await verifyCrossSigningWithKey(passphrase);
  else
    await createCrossSigningUsingKey(passphrase);
}

async function createCrossSigningUsingKey(verificationPhrase = undefined) {
  const mx = initMatrix.matrixClient;
  const recoveryKey = await mx.createRecoveryKeyFromPassphrase(verificationPhrase);
  clearSecretStorageKeys();

  await mx.bootstrapSecretStorage({
    createSecretStorageKey: async () => recoveryKey,
    setupNewKeyBackup: true,
    setupNewSecretStorage: true,
  });

  await mx.bootstrapCrossSigning({
    setupNewCrossSigning: true,
  });
}

async function verifyCrossSigningWithKey(verificationPhrase) {
  const mx = initMatrix.matrixClient;
  try {
    const keyData = await processInput({ phrase: verificationPhrase });
    if (!keyData) return;
    storePrivateKey(keyData.keyId, keyData.privateKey);
    await mx.checkOwnCrossSigningTrust();
  } catch (e) {
    console.log("Cross signing key verification field");
    console.log(e);
  }
};

async function processInput({ key, phrase }) {
  const mx = initMatrix.matrixClient;
  const sSKeyId = getDefaultSSKey();
  const sSKeyInfo = getSSKeyInfo(sSKeyId);

  try {
    const { salt, iterations } = sSKeyInfo.passphrase || {};
    const privateKey = await deriveKey(phrase, salt, iterations);
    const isCorrect = await mx.checkSecretStorageKey(privateKey, sSKeyInfo);

    if (!isCorrect) {
      console.log(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
      return;
    }
    return {
      keyId: sSKeyId,
      key,
      phrase,
      privateKey,
    };
  } catch (e) {
    console.log(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
    console.log(e);
  }
};

export { setupCrossSigningWithPassphrase, createCrossSigningUsingKey }