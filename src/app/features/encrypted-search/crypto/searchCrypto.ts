/**
 * Cryptography layer for encrypted search
 * Handles key derivation, encryption/decryption of search index
 */

import { CRYPTO_CONFIG, SearchableContent, EncryptionKeyEntry } from '../types';
import { getEncryptionKey, setEncryptionKey } from '../db/encryptedSearchDB';

const subtleCrypto = window.crypto.subtle;

/**
 * In-memory key cache to avoid repeated decryption
 */
const keyCache = new Map<string, CryptoKey>();

/**
 * Master key wrapper with metadata
 */
interface MasterKeyData {
  key: CryptoKey;
  userId: string;
  createdAt: number;
}

let masterKeyData: MasterKeyData | null = null;

/**
 * Derive a master encryption key from user credentials
 * Uses PBKDF2 with high iteration count for security
 */
export async function deriveSearchMasterKey(
  userId: string,
  deviceId: string,
  accessToken?: string
): Promise<CryptoKey> {
  // Create password from available entropy
  // We use userId + deviceId + optional accessToken
  const password = `${userId}:${deviceId}${accessToken ? ':' + accessToken : ''}`;

  // Generate or retrieve salt (deterministic based on userId for consistency)
  const salt = await generateDeterministicSalt(userId);

  // Import password as key material
  const keyMaterial = await subtleCrypto.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-GCM key
  const masterKey = await subtleCrypto.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hash: CRYPTO_CONFIG.PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: CRYPTO_CONFIG.ALGORITHM,
      length: CRYPTO_CONFIG.KEY_SIZE,
    },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  );

  // Cache the master key
  masterKeyData = {
    key: masterKey,
    userId,
    createdAt: Date.now(),
  };

  keyCache.set(userId, masterKey);

  return masterKey;
}

/**
 * Generate a deterministic salt from userId
 * This allows us to derive the same key from the same credentials
 */
async function generateDeterministicSalt(userId: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId);

  // Use SHA-256 to generate deterministic bytes
  const hashBuffer = await subtleCrypto.digest('SHA-256', data);

  // Take first 16 bytes as salt
  return new Uint8Array(hashBuffer).slice(0, CRYPTO_CONFIG.SALT_LENGTH);
}

/**
 * Initialize encryption for a user
 * Creates and stores an encrypted master key in the database
 */
export async function initializeEncryption(
  userId: string,
  deviceId: string,
  password?: string
): Promise<void> {
  // Check if already initialized
  const existing = await getEncryptionKey(userId);
  if (existing) {
    console.log('Encryption already initialized for user');
    return;
  }

  // Generate master key
  const masterKey = await deriveSearchMasterKey(userId, deviceId);

  // Generate a wrapping key from password (if provided)
  // Otherwise store the key encrypted with itself (less secure but convenient)
  const wrappingPassword = password ?? `${userId}:${deviceId}`;

  // Store encrypted master key
  await storeEncryptedMasterKey(userId, masterKey, wrappingPassword);

  console.log('Encryption initialized successfully');
}

/**
 * Store the master key encrypted in the database
 */
async function storeEncryptedMasterKey(
  userId: string,
  masterKey: CryptoKey,
  password: string
): Promise<void> {
  // Generate salt for key encryption
  const salt = new Uint8Array(CRYPTO_CONFIG.SALT_LENGTH);
  window.crypto.getRandomValues(salt);

  // Derive wrapping key from password
  const keyMaterial = await subtleCrypto.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const wrappingKey = await subtleCrypto.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hash: CRYPTO_CONFIG.PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: CRYPTO_CONFIG.ALGORITHM,
      length: CRYPTO_CONFIG.KEY_SIZE,
    },
    false,
    ['wrapKey', 'unwrapKey']
  );

  // Generate IV for wrapping
  const iv = new Uint8Array(CRYPTO_CONFIG.IV_LENGTH);
  window.crypto.getRandomValues(iv);

  // Wrap (encrypt) the master key
  const wrappedKey = await subtleCrypto.wrapKey('raw', masterKey, wrappingKey, {
    name: CRYPTO_CONFIG.ALGORITHM,
    iv,
  });

  // Store in database
  const keyEntry: EncryptionKeyEntry = {
    userId,
    encryptedKey: wrappedKey,
    salt,
    iv,
    iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
    algorithm: CRYPTO_CONFIG.ALGORITHM,
    keySize: CRYPTO_CONFIG.KEY_SIZE,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  await setEncryptionKey(keyEntry);
}

/**
 * Load and unwrap the master key from database
 */
export async function loadMasterKey(
  userId: string,
  deviceId: string,
  password?: string
): Promise<CryptoKey> {
  // Check cache first
  const cached = keyCache.get(userId);
  if (cached) {
    return cached;
  }

  // Load from database
  const keyEntry = await getEncryptionKey(userId);
  if (!keyEntry) {
    throw new Error('Encryption key not found. Please initialize encryption first.');
  }

  // Derive unwrapping key
  const unwrappingPassword = password ?? `${userId}:${deviceId}`;

  const keyMaterial = await subtleCrypto.importKey(
    'raw',
    new TextEncoder().encode(unwrappingPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const unwrappingKey = await subtleCrypto.deriveKey(
    {
      name: 'PBKDF2',
      salt: keyEntry.salt,
      iterations: keyEntry.iterations,
      hash: CRYPTO_CONFIG.PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: keyEntry.algorithm,
      length: keyEntry.keySize,
    },
    false,
    ['unwrapKey']
  );

  // Unwrap (decrypt) the master key
  const masterKey = await subtleCrypto.unwrapKey(
    'raw',
    keyEntry.encryptedKey,
    unwrappingKey,
    {
      name: keyEntry.algorithm,
      iv: keyEntry.iv,
    },
    {
      name: CRYPTO_CONFIG.ALGORITHM,
      length: CRYPTO_CONFIG.KEY_SIZE,
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Cache it
  keyCache.set(userId, masterKey);
  masterKeyData = {
    key: masterKey,
    userId,
    createdAt: keyEntry.createdAt,
  };

  return masterKey;
}

/**
 * Get the current master key (must be loaded first)
 */
export function getCurrentMasterKey(): CryptoKey {
  if (!masterKeyData) {
    throw new Error('Master key not loaded. Call loadMasterKey() first.');
  }
  return masterKeyData.key;
}

/**
 * Check if master key is loaded
 */
export function isMasterKeyLoaded(): boolean {
  return masterKeyData !== null;
}

/**
 * Clear master key from memory (for security)
 */
export function clearMasterKey(): void {
  masterKeyData = null;
  keyCache.clear();
}

/**
 * Encrypt searchable content
 */
export async function encryptSearchContent(
  content: SearchableContent,
  roomId: string,
  eventId: string
): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> {
  const masterKey = getCurrentMasterKey();

  // Serialize content to JSON
  const contentJson = JSON.stringify(content);
  const contentBytes = new TextEncoder().encode(contentJson);

  // Generate random IV
  const iv = new Uint8Array(CRYPTO_CONFIG.IV_LENGTH);
  window.crypto.getRandomValues(iv);

  // Additional Authenticated Data (prevents replay attacks)
  const aad = new TextEncoder().encode(`${roomId}:${eventId}`);

  // Encrypt with AES-GCM
  const encryptedData = await subtleCrypto.encrypt(
    {
      name: CRYPTO_CONFIG.ALGORITHM,
      iv,
      additionalData: aad,
    },
    masterKey,
    contentBytes
  );

  return {
    encryptedData,
    iv,
  };
}

/**
 * Decrypt searchable content
 */
export async function decryptSearchContent(
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
  roomId: string,
  eventId: string
): Promise<SearchableContent> {
  const masterKey = getCurrentMasterKey();

  // Additional Authenticated Data (must match encryption)
  const aad = new TextEncoder().encode(`${roomId}:${eventId}`);

  try {
    // Decrypt with AES-GCM
    const decryptedBytes = await subtleCrypto.decrypt(
      {
        name: CRYPTO_CONFIG.ALGORITHM,
        iv,
        additionalData: aad,
      },
      masterKey,
      encryptedData
    );

    // Parse JSON
    const contentJson = new TextDecoder().decode(decryptedBytes);
    return JSON.parse(contentJson);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt search content. The data may be corrupted.');
  }
}

/**
 * Batch decrypt multiple entries
 */
export async function decryptSearchContentBatch(
  entries: Array<{
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
    roomId: string;
    eventId: string;
  }>
): Promise<SearchableContent[]> {
  // Decrypt in parallel for performance
  const promises = entries.map((entry) =>
    decryptSearchContent(entry.encryptedData, entry.iv, entry.roomId, entry.eventId)
  );

  return Promise.all(promises);
}

/**
 * Verify encryption integrity
 */
export async function verifyEncryption(userId: string): Promise<boolean> {
  try {
    const keyEntry = await getEncryptionKey(userId);
    if (!keyEntry) return false;

    // Try to load the master key
    const masterKey = keyCache.get(userId);
    if (!masterKey) return false;

    // Test encryption/decryption
    const testContent: SearchableContent = {
      body: 'test',
      displayName: 'test',
      eventType: 'test',
      content: {},
    };

    const { encryptedData, iv } = await encryptSearchContent(testContent, 'test', 'test');
    const decrypted = await decryptSearchContent(encryptedData, iv, 'test', 'test');

    return decrypted.body === testContent.body;
  } catch (error) {
    console.error('Encryption verification failed:', error);
    return false;
  }
}

/**
 * Generate a random encryption key (for advanced use cases)
 */
export async function generateRandomKey(): Promise<CryptoKey> {
  return subtleCrypto.generateKey(
    {
      name: CRYPTO_CONFIG.ALGORITHM,
      length: CRYPTO_CONFIG.KEY_SIZE,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export master key (for backup purposes)
 * WARNING: This should be handled very carefully
 */
export async function exportMasterKey(masterKey: CryptoKey): Promise<string> {
  const exported = await subtleCrypto.exportKey('raw', masterKey);
  const exportedArray = new Uint8Array(exported);

  // Convert to base64
  return btoa(String.fromCharCode(...exportedArray));
}

/**
 * Import master key from backup
 */
export async function importMasterKey(keyBase64: string): Promise<CryptoKey> {
  // Convert from base64
  const keyData = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  return subtleCrypto.importKey(
    'raw',
    keyData,
    {
      name: CRYPTO_CONFIG.ALGORITHM,
      length: CRYPTO_CONFIG.KEY_SIZE,
    },
    true,
    ['encrypt', 'decrypt']
  );
}
