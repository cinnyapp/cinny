import { AesHmacSha2, AesHmacSha2EncryptedData } from 'neurone/lib/crypto/ssss';
import { useMemo } from 'react';
import { CrossSigningKeys } from 'neurone/lib/crypto/machine';
import { CrossSigningSecrets } from '../../client/context';
import { useClient } from './useClient';
import { useObservableValue } from './useObservableValue';
import { AccountDataType } from '../../types/matrix/accountData';

export const useCrossSigning = (): CrossSigningSecrets | undefined => {
  const ct = useClient();

  const crossSigning = useObservableValue(ct.secrets.crossSigning);

  return crossSigning;
};

export type CrossSigningSecretData = {
  master: AesHmacSha2EncryptedData;
  self: AesHmacSha2EncryptedData;
  user: AesHmacSha2EncryptedData;
};
export const useCrossSigningSecretData = (keyId: string): CrossSigningSecretData | undefined => {
  const crossSigning = useCrossSigning();
  const data: CrossSigningSecretData | undefined = useMemo(() => {
    const master = crossSigning?.master.get(keyId);
    const self = crossSigning?.self.get(keyId);
    const user = crossSigning?.user.get(keyId);

    if (!master || !self || !user) return undefined;

    return {
      master,
      self,
      user,
    };
  }, [crossSigning, keyId]);

  return data;
};

export const getCrossSigningPrivateKeys = async (
  recoveryKey: Uint8Array<ArrayBuffer>,
  secretData: CrossSigningSecretData
): Promise<CrossSigningKeys> => {
  const master = await AesHmacSha2.decrypt(
    recoveryKey,
    AccountDataType.CrossSigningMaster,
    secretData.master
  );
  const self = await AesHmacSha2.decrypt(
    recoveryKey,
    AccountDataType.CrossSigningSelf,
    secretData.self
  );
  const user = await AesHmacSha2.decrypt(
    recoveryKey,
    AccountDataType.CrossSigningUser,
    secretData.user
  );

  return { master, self, user };
};
