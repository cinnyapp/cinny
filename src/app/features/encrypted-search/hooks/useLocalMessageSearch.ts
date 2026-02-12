/**
 * React hook for local encrypted message search
 * Integrates with existing MessageSearch component
 */

import { useCallback } from 'react';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { SearchQuery, LocalSearchResponse } from '../types';
import { parseSearchQuery } from '../search/searchQueryParser';
import { getSearchEngine } from '../search/searchEngine';
import { isMasterKeyLoaded, loadMasterKey } from '../crypto/searchCrypto';

export interface LocalMessageSearchParams {
  term?: string;
  order?: 'relevance' | 'recent';
  rooms?: string[];
  senders?: string[];
}

/**
 * Hook for local message search (encrypted messages)
 */
export const useLocalMessageSearch = (params: LocalMessageSearchParams) => {
  const mx = useMatrixClient();

  const searchMessages = useCallback(
    async (offset: number = 0): Promise<LocalSearchResponse> => {
      // Check if search is initialized
      if (!isMasterKeyLoaded()) {
        const userId = mx.getUserId();
        const deviceId = mx.getDeviceId();

        if (!userId || !deviceId) {
          throw new Error('User not authenticated');
        }

        // Load master key
        try {
          await loadMasterKey(userId, deviceId);
        } catch (error) {
          console.error('Failed to load encryption key:', error);
          throw new Error('Encrypted search not initialized. Please enable it in settings.');
        }
      }

      // Return empty results if no search term
      if (!params.term) {
        return {
          groups: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      // Parse query
      const query: SearchQuery = parseSearchQuery(params.term);

      // Apply additional filters from params
      if (params.rooms && params.rooms.length > 0) {
        // If 'in:' filter not in query, use first room from params
        if (!query.in && params.rooms.length === 1) {
          query.in = params.rooms[0];
        }
        // For multiple rooms, we'd need to run multiple queries
        // For now, just use the first one
      }

      if (params.senders && params.senders.length > 0 && !query.from) {
        query.from = params.senders[0];
      }

      if (params.order) {
        query.orderBy = params.order;
      }
      // Execute search
      const searchEngine = getSearchEngine();
      const results = await searchEngine.search(query, 20, offset);
      return results;
    },
    [mx, params.term, params.order, params.rooms, params.senders]
  );

  return searchMessages;
};

/**
 * Hook to check if local search is available
 */
export const useLocalSearchAvailable = (): boolean => {
  return isMasterKeyLoaded();
};

/**
 * Hook to get search statistics
 */
export const useLocalSearchStats = () => {
  const mx = useMatrixClient();

  const getStats = useCallback(async () => {
    const userId = mx.getUserId();
    if (!userId) return null;

    // Import here to avoid circular dependencies
    const { getMetadata, getIndexedMessageCount } = await import('../db/encryptedSearchDB');

    const metadata = await getMetadata(userId);
    const totalMessages = await getIndexedMessageCount();

    return {
      totalIndexedMessages: totalMessages,
      lastIndexedAt: metadata?.updatedAt,
      roomsIndexed: metadata ? Object.keys(metadata.indexingProgress).length : 0,
    };
  }, [mx]);

  return getStats;
};
