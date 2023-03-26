import initMatrix from '../client/initMatrix';
import { clearSecretStorageKeys } from '../client/state/secretStorageKeys';
import { authRequest } from '../app/organisms/settings/AuthRequest';
import { accessSecretStorage } from '../app/organisms/settings/SecretStorageAccess';
import { getDefaultSSKey, getSSKeyInfo } from '../util/matrixUtil';
import { deriveKey } from 'matrix-js-sdk/lib/crypto/key_passphrase';
import { useStore } from '../app/hooks/useStore';

async function createCrossSigningUsingKey(securityPhrase = undefined) {
  const mx = initMatrix.matrixClient;
  const recoveryKey = await mx.createRecoveryKeyFromPassphrase(securityPhrase);
  clearSecretStorageKeys();

  await mx.bootstrapSecretStorage({
    createSecretStorageKey: async () => recoveryKey,
    setupNewKeyBackup: true,
    setupNewSecretStorage: true,
  });

  const authUploadDeviceSigningKeys = async (makeRequest) => {
    await authRequest('Setup cross signing', async (auth) => {
      await makeRequest(auth);
    });
    // setTimeout(() => {
    //   if (isDone) securityKeyDialog(recoveryKey);
    //   else failedDialog();
    // });
  };

  await mx.bootstrapCrossSigning({
    authUploadDeviceSigningKeys,
    setupNewCrossSigning: true,
  });
}

// TODO: test the verification code logic
async function verifyCrossSigningWithKey(device) {
  const mx = initMatrix.matrixClient;
  // addToProcessing(device);
  try {
    const keyData = await processInput({ phrase: 'test1234' });
    console.log("########### key data return ##########");
    console.log(keyData);
    if (!keyData) return;
    const t = await mx.checkOwnCrossSigningTrust();
    console.log("this is the result after verification");
    console.log(t);
  } catch (e) {
    console.log("watch out error occured");
    console.log(e);
  }
};

async function processInput({ key, phrase }) {
  console.log(key);
  console.log(phrase);
  // const mountStore = useStore();
  // mountStore.setItem(true);
  const mx = initMatrix.matrixClient;
  const sSKeyId = getDefaultSSKey();
  const sSKeyInfo = getSSKeyInfo(sSKeyId);

  try {
    const { salt, iterations } = sSKeyInfo.passphrase || {};
    const privateKey = await deriveKey(phrase, salt, iterations);
    const isCorrect = await mx.checkSecretStorageKey(privateKey, sSKeyInfo);

    // if (!mountStore.getItem()) return;
    if (!isCorrect) {
      console.log(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
      // setProcess(false);
      return;
    }
    return {
      keyId: sSKeyId,
      key,
      phrase,
      privateKey,
    };
  } catch (e) {
    // if (!mountStore.getItem()) return;
    console.log(e);
    console.log(`Incorrect Security ${key ? 'Key' : 'Phrase'}`);
    // setProcess(false);
  }
};

export { createCrossSigningUsingKey, verifyCrossSigningWithKey }