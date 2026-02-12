/**
 * IndexedDB layer for encrypted search
 * Manages database schema, CRUD operations, and transactions
 */

import {
  DB_NAME,
  DB_VERSION,
  STORE_NAMES,
  INDEX_NAMES,
  IndexMetadata,
  EncryptedSearchEntry,
  EncryptionKeyEntry,
  SearchCacheEntry,
  SearchQuery,
  CACHE_CONFIG,
} from '../types';

/**
 * Database singleton instance
 */
let dbInstance: IDBDatabase | null = null;

/**
 * Initialize and open the encrypted search database
 */
export async function initEncryptedSearchDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle unexpected close
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction!;

      try {
        // Create stores based on version
        if (event.oldVersion < 1) {
          createSchemaV1(db);
        }

        // Future migrations would go here
        // if (event.oldVersion < 2) { createSchemaV2(db); }
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    };
  });
}

/**
 * Create schema version 1
 */
function createSchemaV1(db: IDBDatabase): void {
  // Store 1: Metadata
  const metadataStore = db.createObjectStore(STORE_NAMES.METADATA, {
    keyPath: 'userId',
  });

  // Store 2: Search Index
  const searchIndexStore = db.createObjectStore(STORE_NAMES.SEARCH_INDEX, {
    keyPath: 'id',
  });

  // Indexes for efficient filtering
  searchIndexStore.createIndex(INDEX_NAMES.SEARCH_INDEX.ROOM_ID, 'roomId', {
    unique: false,
  });

  searchIndexStore.createIndex(INDEX_NAMES.SEARCH_INDEX.SENDER_ID, 'senderId', {
    unique: false,
  });

  searchIndexStore.createIndex(INDEX_NAMES.SEARCH_INDEX.TIMESTAMP, 'timestamp', {
    unique: false,
  });

  searchIndexStore.createIndex(INDEX_NAMES.SEARCH_INDEX.MENTIONS, 'mentions', {
    unique: false,
    multiEntry: true,
  });

  searchIndexStore.createIndex(INDEX_NAMES.SEARCH_INDEX.IS_PINNED, 'isPinned', {
    unique: false,
  });

  // Composite index for efficient room-based queries with time ordering
  searchIndexStore.createIndex(
    INDEX_NAMES.SEARCH_INDEX.ROOM_TIMESTAMP,
    ['roomId', 'timestamp'],
    { unique: false }
  );

  // Store 3: Encryption Keys
  const encryptionKeysStore = db.createObjectStore(STORE_NAMES.ENCRYPTION_KEYS, {
    keyPath: 'userId',
  });

  // Store 4: Search Cache
  const searchCacheStore = db.createObjectStore(STORE_NAMES.SEARCH_CACHE, {
    keyPath: 'queryHash',
  });

  searchCacheStore.createIndex(INDEX_NAMES.SEARCH_CACHE.EXPIRES_AT, 'expiresAt', {
    unique: false,
  });
}

/**
 * Close the database
 */
export function closeEncryptedSearchDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the entire database (for cleanup/reset)
 */
export async function deleteEncryptedSearchDB(): Promise<void> {
  closeEncryptedSearchDB();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('Database deletion blocked - close all tabs');
    };
  });
}

// ============================================================================
// Metadata Operations
// ============================================================================

export async function getMetadata(userId: string): Promise<IndexMetadata | null> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.METADATA, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.METADATA);
    const request = store.get(userId);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function setMetadata(metadata: IndexMetadata): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.METADATA, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.METADATA);
    const request = store.put(metadata);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateMetadata(
  userId: string,
  updates: Partial<IndexMetadata>
): Promise<void> {
  const existing = await getMetadata(userId);
  if (!existing) {
    throw new Error('Metadata not found');
  }

  const updated: IndexMetadata = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  await setMetadata(updated);
}

// ============================================================================
// Search Index Operations
// ============================================================================

export async function addSearchEntry(entry: EncryptedSearchEntry): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);
    const request = store.put(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function addSearchEntriesBatch(entries: EncryptedSearchEntry[]): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);

    let completed = 0;
    let hasError = false;

    entries.forEach((entry) => {
      if (hasError) return;

      const request = store.put(entry);

      request.onsuccess = () => {
        completed++;
        if (completed === entries.length) {
          resolve();
        }
      };

      request.onerror = () => {
        hasError = true;
        transaction.abort();
        reject(request.error);
      };
    });

    // Handle empty batch
    if (entries.length === 0) {
      resolve();
    }
  });
}

export async function getSearchEntry(id: string): Promise<EncryptedSearchEntry | null> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getSearchEntriesByIds(ids: string[]): Promise<EncryptedSearchEntry[]> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);

    const results: EncryptedSearchEntry[] = [];
    let completed = 0;

    ids.forEach((id) => {
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          results.push(request.result);
        }
        completed++;
        if (completed === ids.length) {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });

    if (ids.length === 0) {
      resolve([]);
    }
  });
}

export async function deleteSearchEntry(id: string): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Query search index with filters
 */
export async function querySearchIndex(
  query: SearchQuery,
  limit: number = 100,
  offset: number = 0
): Promise<EncryptedSearchEntry[]> {
  const db = await initEncryptedSearchDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);

    const results: EncryptedSearchEntry[] = [];
    let skipped = 0;

    // Determine which index to use based on query
    let request: IDBRequest<IDBCursorWithValue | null>;

    if (query.in) {
      // Use room index if filtering by room
      const index = store.index(INDEX_NAMES.SEARCH_INDEX.ROOM_TIMESTAMP);
      const range = IDBKeyRange.bound([query.in, 0], [query.in, Date.now()]);
      request = index.openCursor(range, 'prev'); // Most recent first
    } else if (query.from) {
      // Use sender index
      const index = store.index(INDEX_NAMES.SEARCH_INDEX.SENDER_ID);
      request = index.openCursor(IDBKeyRange.only(query.from), 'prev');
    } else if (query.mentions) {
      // Use mentions index
      const index = store.index(INDEX_NAMES.SEARCH_INDEX.MENTIONS);
      request = index.openCursor(IDBKeyRange.only(query.mentions), 'prev');
    } else {
      // Use timestamp index for general queries
      const index = store.index(INDEX_NAMES.SEARCH_INDEX.TIMESTAMP);
      request = index.openCursor(null, 'prev');
    }

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (!cursor || results.length >= limit) {
        resolve(results);
        return;
      }

      const entry = cursor.value as EncryptedSearchEntry;

      // Apply additional filters
      if (shouldIncludeEntry(entry, query)) {
        if (skipped < offset) {
          skipped++;
        } else {
          results.push(entry);
        }
      }

      cursor.continue();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if entry matches all query filters
 */
function shouldIncludeEntry(entry: EncryptedSearchEntry, query: SearchQuery): boolean {
  // Deleted entries are never included
  if (entry.isDeleted) return false;

  // Room filter
  if (query.in && entry.roomId !== query.in) return false;

  // Sender filter
  if (query.from && entry.senderId !== query.from) return false;

  // Mentions filter
  if (query.mentions && !entry.mentions.includes(query.mentions)) return false;

  // Time filters
  if (query.before && entry.timestamp >= query.before) return false;
  if (query.after && entry.timestamp <= query.after) return false;

  // During filter (year/month)
  if (query.during) {
    const date = new Date(entry.timestamp);
    if (date.getFullYear() !== query.during.year) return false;
    if (query.during.month !== undefined && date.getMonth() + 1 !== query.during.month) {
      return false;
    }
  }

  // Pinned filter
  if (query.pinned !== undefined && entry.isPinned !== query.pinned) return false;

  // Content filters
  if (query.has) {
    switch (query.has) {
      case 'image':
        if (!entry.hasImage) return false;
        break;
      case 'video':
        if (!entry.hasVideo) return false;
        break;
      case 'audio':
        if (!entry.hasAudio) return false;
        break;
      case 'file':
        if (!entry.hasFile) return false;
        break;
      case 'link':
        if (!entry.hasLink) return false;
        break;
      case 'attachment':
        if (!entry.hasAttachment) return false;
        break;
    }
  }

  return true;
}

/**
 * Get total count of indexed messages
 */
export async function getIndexedMessageCount(): Promise<number> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get count of indexed messages in a room
 */
export async function getRoomIndexedMessageCount(roomId: string): Promise<number> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);
    const index = store.index(INDEX_NAMES.SEARCH_INDEX.ROOM_ID);
    const request = index.count(IDBKeyRange.only(roomId));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all entries for a room
 */
export async function clearRoomIndex(roomId: string): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_INDEX, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_INDEX);
    const index = store.index(INDEX_NAMES.SEARCH_INDEX.ROOM_ID);
    const request = index.openKeyCursor(IDBKeyRange.only(roomId));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursor>).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Encryption Key Operations
// ============================================================================

export async function getEncryptionKey(userId: string): Promise<EncryptionKeyEntry | null> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.ENCRYPTION_KEYS, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.ENCRYPTION_KEYS);
    const request = store.get(userId);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function setEncryptionKey(keyEntry: EncryptionKeyEntry): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.ENCRYPTION_KEYS, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.ENCRYPTION_KEYS);
    const request = store.put(keyEntry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteEncryptionKey(userId: string): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.ENCRYPTION_KEYS, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.ENCRYPTION_KEYS);
    const request = store.delete(userId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Search Cache Operations
// ============================================================================

export async function getCachedSearch(queryHash: string): Promise<SearchCacheEntry | null> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_CACHE, 'readonly');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_CACHE);
    const request = store.get(queryHash);

    request.onsuccess = () => {
      const result = request.result;
      // Check if expired
      if (result && result.expiresAt < Date.now()) {
        resolve(null);
      } else {
        resolve(result ?? null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function setCachedSearch(entry: SearchCacheEntry): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_CACHE, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_CACHE);
    const request = store.put(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredCache(): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_CACHE, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_CACHE);
    const index = store.index(INDEX_NAMES.SEARCH_CACHE.EXPIRES_AT);
    const now = Date.now();
    const range = IDBKeyRange.upperBound(now);
    const request = index.openKeyCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursor>).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCache(): Promise<void> {
  const db = await initEncryptedSearchDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES.SEARCH_CACHE, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.SEARCH_CACHE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate cache key from query
 */
export function generateQueryHash(query: SearchQuery): string {
  const normalized = JSON.stringify(query, Object.keys(query).sort());
  return hashString(normalized);
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
