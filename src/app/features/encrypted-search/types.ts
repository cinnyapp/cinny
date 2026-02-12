/**
 * Type definitions for encrypted search feature
 */

/**
 * Metadata about the search index
 */
export interface IndexMetadata {
  version: number;
  userId: string;
  lastIndexedEventId?: string;
  totalIndexedEvents: number;
  createdAt: number;
  updatedAt: number;
  indexingProgress: Record<string, RoomIndexProgress>;
}

export interface RoomIndexProgress {
  lastEventId: string;
  lastTimestamp: number;
  totalEvents: number;
}

/**
 * Encrypted search entry stored in IndexedDB
 */
export interface EncryptedSearchEntry {
  // Primary key
  id: string; // Format: `${roomId}:${eventId}`

  // Metadata (unencrypted for filtering)
  roomId: string;
  eventId: string;
  senderId: string;
  timestamp: number;

  // Message state
  isEncrypted: boolean;
  isPinned: boolean;
  isEdited: boolean;
  isDeleted: boolean;

  // Mentions and references
  mentions: string[];
  replyToEventId?: string;
  threadRootId?: string;

  // Content type flags (for `has:` filters)
  hasAttachment: boolean;
  hasImage: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  hasFile: boolean;
  hasLink: boolean;

  // Encrypted data
  encryptedData: ArrayBuffer;
  iv: Uint8Array;

  // Crypto metadata
  cryptoVersion: number;

  // Sync metadata
  indexedAt: number;
}

/**
 * Content that gets encrypted in EncryptedSearchEntry
 */
export interface SearchableContent {
  // Textual content for FTS
  body: string;

  // Display context
  displayName: string;
  roomName?: string;

  // Rich metadata
  attachments?: AttachmentInfo[];
  links?: string[];

  // Original event data (minimal for display)
  eventType: string;
  content: any;
}

export interface AttachmentInfo {
  type: string;
  name: string;
  size: number;
}

/**
 * Encryption key entry
 */
export interface EncryptionKeyEntry {
  userId: string;

  // Encrypted master key
  encryptedKey: ArrayBuffer;
  salt: Uint8Array;
  iv: Uint8Array;

  // Derivation parameters
  iterations: number;
  algorithm: string;
  keySize: number;

  createdAt: number;
  lastUsedAt: number;
}

/**
 * Search cache entry
 */
export interface SearchCacheEntry {
  queryHash: string;
  query: SearchQuery;
  results: string[];
  totalCount: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * Parsed search query
 */
export interface SearchQuery {
  // Text search
  text?: string;

  // Filters
  from?: string; // sender ID
  mentions?: string; // mentioned user ID
  in?: string; // room ID
  before?: number; // timestamp
  after?: number; // timestamp
  during?: { year: number; month?: number }; // date range

  // Content filters
  has?: ContentFilter;
  pinned?: boolean;

  // Sort options
  orderBy?: 'relevance' | 'recent';
}

export type ContentFilter = 'image' | 'video' | 'audio' | 'file' | 'link' | 'attachment';

/**
 * Search result item
 */
export interface LocalSearchResult {
  entry: EncryptedSearchEntry;
  content: SearchableContent;
  score?: number;
  highlights?: string[];
}

/**
 * Search results grouped by room
 */
export interface LocalSearchResultGroup {
  roomId: string;
  items: LocalSearchResult[];
}

/**
 * Complete search response
 */
export interface LocalSearchResponse {
  groups: LocalSearchResultGroup[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Indexing progress event
 */
export interface IndexingProgressEvent {
  type: 'progress' | 'complete' | 'error';
  roomId?: string;
  processed: number;
  total: number;
  error?: Error;
}

/**
 * Database configuration
 */
export const DB_NAME = 'cinny-encrypted-search';
export const DB_VERSION = 1;

export const STORE_NAMES = {
  METADATA: 'metadata',
  SEARCH_INDEX: 'search_index',
  ENCRYPTION_KEYS: 'encryption_keys',
  SEARCH_CACHE: 'search_cache',
} as const;

export const INDEX_NAMES = {
  SEARCH_INDEX: {
    ROOM_ID: 'roomId',
    SENDER_ID: 'senderId',
    TIMESTAMP: 'timestamp',
    MENTIONS: 'mentions',
    IS_PINNED: 'isPinned',
    ROOM_TIMESTAMP: 'room_timestamp',
  },
  SEARCH_CACHE: {
    EXPIRES_AT: 'expiresAt',
  },
} as const;

/**
 * Crypto constants
 */
export const CRYPTO_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_SIZE: 256,
  IV_LENGTH: 12,
  SALT_LENGTH: 16,
  PBKDF2_ITERATIONS: 100000,
  PBKDF2_HASH: 'SHA-512',
  CURRENT_VERSION: 1,
} as const;

/**
 * Cache constants
 */
export const CACHE_CONFIG = {
  TTL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 100, // Max cached queries
} as const;

/**
 * Indexing constants
 */
export const INDEXING_CONFIG = {
  BATCH_SIZE: 100,
  RETENTION_DAYS: 365, // Default: 1 year
  MAX_RETRY_ATTEMPTS: 3,
} as const;
