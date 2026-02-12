import { createClient, MatrixClient, IndexedDBStore, IndexedDBCryptoStore } from 'matrix-js-sdk';

import { cryptoCallbacks } from './secretStorageKeys';
import { clearNavToActivePathStore } from '../app/state/navToActivePath';
import {
  initializeEncryption,
  loadMasterKey,
  initMessageIndexer,
  getEncryptionKey,
  clearMasterKey,
  destroyMessageIndexer,
  initHistoricalIndexer,
} from '../app/features/encrypted-search';

type Session = {
  baseUrl: string;
  accessToken: string;
  userId: string;
  deviceId: string;
};

export const initClient = async (session: Session): Promise<MatrixClient> => {
  const indexedDBStore = new IndexedDBStore({
    indexedDB: global.indexedDB,
    localStorage: global.localStorage,
    dbName: 'web-sync-store',
  });

  const legacyCryptoStore = new IndexedDBCryptoStore(global.indexedDB, 'crypto-store');

  const mx = createClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    store: indexedDBStore,
    cryptoStore: legacyCryptoStore,
    deviceId: session.deviceId,
    timelineSupport: true,
    cryptoCallbacks: cryptoCallbacks as any,
    verificationMethods: ['m.sas.v1'],
  });

  await indexedDBStore.startup();
  await mx.initRustCrypto();

  mx.setMaxListeners(50);

  return mx;
};

export const startClient = async (mx: MatrixClient) => {
  await mx.startClient({
    lazyLoadMembers: true,
  });

  // Initialize encrypted search after client starts
  const userId = mx.getUserId();
  const deviceId = mx.getDeviceId();

  if (userId && deviceId) {
    try {
      // Check if encryption is already initialized
      const existingKey = await getEncryptionKey(userId);

      if (!existingKey) {
        console.log('Initializing encrypted search for the first time...');
        await initializeEncryption(userId, deviceId);
      }

      // Load the encryption key
      await loadMasterKey(userId, deviceId);

      // Start real-time indexing
      const messageIndexer = initMessageIndexer(mx);
      messageIndexer.start();

      // Initialize historical indexer (but don't start it automatically)
      initHistoricalIndexer(mx);

      console.log('Encrypted search initialized successfully');
    } catch (error) {
      console.error('Failed to initialize encrypted search:', error);
      // Don't block app startup if encrypted search fails
    }
  }
};

export const clearCacheAndReload = async (mx: MatrixClient) => {
  mx.stopClient();
  clearNavToActivePathStore(mx.getSafeUserId());
  await mx.store.deleteAllData();
  window.location.reload();
};

export const logoutClient = async (mx: MatrixClient) => {
  mx.stopClient();

  // Clean up encrypted search
  try {
    clearMasterKey();
    destroyMessageIndexer();
  } catch (error) {
    console.error('Failed to cleanup encrypted search:', error);
  }

  try {
    await mx.logout();
  } catch {
    // ignore if failed to logout
  }
  await mx.clearStores();
  window.localStorage.clear();
  window.location.reload();
};

export const clearLoginData = async () => {
  const dbs = await window.indexedDB.databases();

  dbs.forEach((idbInfo) => {
    const { name } = idbInfo;
    if (name) {
      window.indexedDB.deleteDatabase(name);
    }
  });

  window.localStorage.clear();
  window.location.reload();
};
