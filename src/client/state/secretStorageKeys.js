const secretStorageKeys = new Map();

export function storePrivateKey(keyId, privateKey) {
  if (privateKey instanceof Uint8Array === false) {
    throw new Error('Unable to store, privateKey is invalid.');
  }
  secretStorageKeys.set(keyId, privateKey);
}

export function hasPrivateKey(keyId) {
  return secretStorageKeys.get(keyId) instanceof Uint8Array;
}

export function getPrivateKey(keyId) {
  return secretStorageKeys.get(keyId);
}

export function deletePrivateKey(keyId) {
  delete secretStorageKeys.delete(keyId);
}

export function clearSecretStorageKeys() {
  secretStorageKeys.clear();
}

async function getSecretStorageKey({ keys }) {
  const keyIds = Object.keys(keys);
  const keyId = keyIds.find(hasPrivateKey);
  if (!keyId) return undefined;
  const privateKey = getPrivateKey(keyId);
  return [keyId, privateKey];
}

function cacheSecretStorageKey(keyId, keyInfo, privateKey) {
  secretStorageKeys.set(keyId, privateKey);
}

export const cryptoCallbacks = {
  getSecretStorageKey,
  cacheSecretStorageKey,
};
