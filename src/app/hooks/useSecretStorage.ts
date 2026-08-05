import { ObjectReader } from 'neurone/lib/utils';
import { AesHmacSha2KeyDescription, KeyStorage } from 'neurone/lib/crypto/ssss';
import { useAccountData } from './storage/useAccountData';

export const useSecretStorageDefaultKeyId = (): string | undefined => {
  const defaultKeyResult = useAccountData(KeyStorage.defaultKeyIdentifier());
  const defaultKeyEvent = defaultKeyResult.value;
  const defaultKeyId = ObjectReader.string(defaultKeyEvent?.content, 'key');

  return defaultKeyId;
};

export const useSecretStorageKeyContent = (
  keyId: string
): AesHmacSha2KeyDescription | undefined => {
  const keyResult = useAccountData(KeyStorage.keyIdentifier(keyId));
  const keyEvent = keyResult.value;
  const secretStorageKey = keyEvent?.content
    ? KeyStorage.getKeyDescription(keyEvent.content)
    : undefined;

  return secretStorageKey;
};
