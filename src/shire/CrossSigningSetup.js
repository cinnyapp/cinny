import initMatrix from '../client/initMatrix';
import { clearSecretStorageKeys } from '../client/state/secretStorageKeys';
import { authRequest } from '../app/organisms/settings/AuthRequest';

export default async function SetupCrossSigningUsingPassPhrase(
  securityPhrase = undefined,
) {
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
