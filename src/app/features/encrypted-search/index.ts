/**
 * Encrypted Search Feature
 * Main export file
 */

// Types
export * from './types';

// Database
export {
  initEncryptedSearchDB,
  closeEncryptedSearchDB,
  deleteEncryptedSearchDB,
  getMetadata,
  setMetadata,
  updateMetadata,
  addSearchEntry,
  addSearchEntriesBatch,
  getSearchEntry,
  getSearchEntriesByIds,
  querySearchIndex,
  getIndexedMessageCount,
  getRoomIndexedMessageCount,
  clearRoomIndex,
  getEncryptionKey,
  setEncryptionKey,
  getCachedSearch,
  setCachedSearch,
  clearExpiredCache,
  clearAllCache,
  generateQueryHash,
} from './db/encryptedSearchDB';

// Crypto
export {
  deriveSearchMasterKey,
  initializeEncryption,
  loadMasterKey,
  getCurrentMasterKey,
  isMasterKeyLoaded,
  clearMasterKey,
  encryptSearchContent,
  decryptSearchContent,
  decryptSearchContentBatch,
  verifyEncryption,
  exportMasterKey,
  importMasterKey,
} from './crypto/searchCrypto';

// Indexing
export {
  MessageIndexer,
  initMessageIndexer,
  getMessageIndexer,
  destroyMessageIndexer,
} from './indexing/messageIndexer';

// Search
export {
  parseSearchQuery,
  serializeSearchQuery,
  validateSearchQuery,
  getFilterSuggestions,
  getContentFilterSuggestions,
  extractUserIdsFromQuery,
  extractRoomIdsFromQuery,
  highlightSearchTerms,
  splitSearchTerms,
} from './search/searchQueryParser';

export { SearchEngine, getSearchEngine, destroySearchEngine } from './search/searchEngine';

// Hooks
export {
  useLocalMessageSearch,
  useLocalSearchAvailable,
  useLocalSearchStats,
} from './hooks/useLocalMessageSearch';

// Historical Indexing
export {
  HistoricalIndexer,
  initHistoricalIndexer,
  getHistoricalIndexer,
  destroyHistoricalIndexer,
} from './indexing/historicalIndexer';
export type { ProgressCallback } from './indexing/historicalIndexer';

// Components
export { SearchModeToggle } from './components/SearchModeToggle';
export type { SearchMode } from './components/SearchModeToggle';
export { IndexingStatus } from './components/IndexingStatus';
