const secretStorageKeys = {};

export function storePrivateKey(keyId, privateKey) {
  if (privateKey instanceof Uint8Array === false) {
    throw new Error('Unable to store, privateKey is invalid.');
  }
  secretStorageKeys[keyId] = privateKey;
}

export function hasPrivateKey(keyId) {
  return secretStorageKeys[keyId] instanceof Uint8Array;
}

export function getPrivateKey(keyId) {
  return secretStorageKeys[keyId];
}

export function deletePrivateKey(keyId) {
  delete secretStorageKeys[keyId];
}

async function getSecretStorageKey({ keys }) {
  const keyIds = Object.keys(keys);
  const keyId = keyIds.find(hasPrivateKey);
  if (!keyId) return undefined;
  const privateKey = getPrivateKey(keyId);
  return [keyId, privateKey];
}

export const cryptoCallbacks = {
  getSecretStorageKey,
};
