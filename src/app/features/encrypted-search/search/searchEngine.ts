/**
 * Search engine for encrypted messages
 * Provides full-text search with ranking and highlighting
 */

import {
  SearchQuery,
  LocalSearchResult,
  LocalSearchResponse,
  LocalSearchResultGroup,
  EncryptedSearchEntry,
  SearchableContent,
  CACHE_CONFIG,
} from '../types';
import {
  querySearchIndex,
  getSearchEntriesByIds,
  getCachedSearch,
  setCachedSearch,
  generateQueryHash,
} from '../db/encryptedSearchDB';
import { decryptSearchContentBatch } from '../crypto/searchCrypto';
import { splitSearchTerms } from './searchQueryParser';

/**
 * Search engine class
 */
export class SearchEngine {
  /**
   * Perform a search with the given query
   */
  public async search(
    query: SearchQuery,
    limit: number = 20,
    offset: number = 0
  ): Promise<LocalSearchResponse> {
    // Check cache first
    if (offset === 0) {
      const cached = await this.checkCache(query);
      if (cached) {
        return this.buildResponse(cached.results, cached.totalCount, limit, offset);
      }
    }

    const desiredCount = offset + limit;
    const batchSize = Math.max(limit * 5, 100);
    const aggregatedResults: LocalSearchResult[] = [];
    let cursorOffset = 0;
    let hasMorePotential = false;

    while (true) {
      const entries = await querySearchIndex(query, batchSize, cursorOffset);
      if (entries.length === 0) {
        hasMorePotential = false;
        break;
      }

      cursorOffset += entries.length;
      const decryptedBatch = await this.decryptEntries(entries);
      const filteredBatch = query.text
        ? this.filterByText(decryptedBatch, query.text)
        : decryptedBatch;

      aggregatedResults.push(...filteredBatch);

      if (aggregatedResults.length >= desiredCount) {
        hasMorePotential = entries.length === batchSize;
        break;
      }

      if (entries.length < batchSize) {
        hasMorePotential = false;
        break;
      }
    }

    const totalCount = hasMorePotential
      ? Math.max(aggregatedResults.length + 1, desiredCount + 1)
      : aggregatedResults.length;

    // Rank results
    const rankedResults = this.rankResults(aggregatedResults, query);

    // Cache results (first page only)
    if (offset === 0 && rankedResults.length > 0) {
      await this.cacheResults(query, rankedResults);
    }

    // Build response
    const response = this.buildResponse(rankedResults, totalCount, limit, offset);
    return response;
  }

  /**
   * Check if results are cached
   */
  private async checkCache(
    query: SearchQuery
  ): Promise<{ results: LocalSearchResult[]; totalCount: number } | null> {
    const queryHash = generateQueryHash(query);
    const cached = await getCachedSearch(queryHash);

    if (!cached) return null;

    // Get entries from cache
    const entries = await getSearchEntriesByIds(cached.results);
    const results = await this.decryptEntries(entries);

    return {
      results,
      totalCount: cached.totalCount,
    };
  }

  /**
   * Cache search results
   */
  private async cacheResults(query: SearchQuery, results: LocalSearchResult[]): Promise<void> {
    const queryHash = generateQueryHash(query);
    const now = Date.now();

    await setCachedSearch({
      queryHash,
      query,
      results: results.map((r) => r.entry.id),
      totalCount: results.length,
      createdAt: now,
      expiresAt: now + CACHE_CONFIG.TTL_MS,
    });
  }

  /**
   * Decrypt search entries
   */
  private async decryptEntries(entries: EncryptedSearchEntry[]): Promise<LocalSearchResult[]> {
    if (entries.length === 0) return [];

    // Prepare for batch decryption
    const decryptionData = entries.map((entry) => ({
      encryptedData: entry.encryptedData,
      iv: entry.iv,
      roomId: entry.roomId,
      eventId: entry.eventId,
    }));

    // Batch decrypt
    const contents = await decryptSearchContentBatch(decryptionData);

    // Combine entries with decrypted content
    return entries.map((entry, index) => ({
      entry,
      content: contents[index],
    }));
  }

  /**
   * Filter results by text search
   */
  private filterByText(results: LocalSearchResult[], searchText: string): LocalSearchResult[] {
    const terms = splitSearchTerms(searchText.toLowerCase());

    return results.filter((result) => {
      const body = result.content.body.toLowerCase();
      const displayName = result.content.displayName.toLowerCase();

      // Check if all terms are present
      return terms.every((term) => body.includes(term) || displayName.includes(term));
    });
  }

  /**
   * Rank search results
   */
  private rankResults(results: LocalSearchResult[], query: SearchQuery): LocalSearchResult[] {
    // Calculate scores
    const scored = results.map((result) => {
      const score = this.calculateScore(result, query);
      return {
        ...result,
        score,
      };
    });

    // Sort by score or time
    if (query.orderBy === 'relevance' && query.text) {
      scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else {
      // Sort by timestamp (most recent first)
      scored.sort((a, b) => b.entry.timestamp - a.entry.timestamp);
    }

    return scored;
  }

  /**
   * Calculate relevance score for a result
   */
  private calculateScore(result: LocalSearchResult, query: SearchQuery): number {
    let score = 0;

    if (!query.text) return score;

    const terms = splitSearchTerms(query.text.toLowerCase());
    const body = result.content.body.toLowerCase();
    const displayName = result.content.displayName.toLowerCase();

    terms.forEach((term) => {
      // Exact phrase match (higher weight)
      if (body.includes(query.text!.toLowerCase())) {
        score += 10;
      }

      // Term frequency
      const termCount = (body.match(new RegExp(escapeRegex(term), 'g')) || []).length;
      score += termCount * 2;

      // Match in sender name
      if (displayName.includes(term)) {
        score += 3;
      }

      // Position of first occurrence (earlier is better)
      const firstIndex = body.indexOf(term);
      if (firstIndex !== -1) {
        score += Math.max(0, 5 - firstIndex / 100);
      }
    });

    // Boost for pinned messages
    if (result.entry.isPinned) {
      score += 5;
    }

    // Recency boost (slight preference for recent messages)
    const age = Date.now() - result.entry.timestamp;
    const daysSinceMessage = age / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSinceMessage / 30);

    return score;
  }

  /**
   * Build search response with pagination
   */
  private buildResponse(
    results: LocalSearchResult[],
    totalCount: number,
    limit: number,
    offset: number
  ): LocalSearchResponse {
    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    // Generate highlights
    const resultsWithHighlights = paginatedResults.map((result) => ({
      ...result,
      highlights: this.extractHighlights(result, result.highlights),
    }));

    // Group by room
    const groups = this.groupByRoom(resultsWithHighlights);

    return {
      groups,
      totalCount,
      hasMore: offset + limit < totalCount,
      nextOffset: offset + limit < totalCount ? offset + limit : undefined,
    };
  }

  /**
   * Group results by room
   */
  private groupByRoom(results: LocalSearchResult[]): LocalSearchResultGroup[] {
    const groups: LocalSearchResultGroup[] = [];

    results.forEach((result) => {
      const roomId = result.entry.roomId;

      // Find existing group
      let group = groups.find((g) => g.roomId === roomId);

      if (!group) {
        group = {
          roomId,
          items: [],
        };
        groups.push(group);
      }

      group.items.push(result);
    });

    return groups;
  }

  /**
   * Extract highlighted snippets from text
   */
  private extractHighlights(
    entry: LocalSearchResult,
    existingHighlights?: string[]
  ): string[] | undefined {
    if (existingHighlights && existingHighlights.length > 0) {
      return existingHighlights;
    }

    const { content } = entry;
    if (content.attachments && content.attachments.length > 0) {
      return content.attachments.map((attachment) => {
        const labelParts = [attachment.type.toUpperCase()];
        if (attachment.name) {
          labelParts.push(attachment.name);
        }
        return labelParts.join(': ');
      });
    }

    const snippet = content.body.slice(0, 150);
    return [snippet + (content.body.length > 150 ? '...' : '')];
  }

  /**
   * Get search suggestions based on partial query
   */
  public async getSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    // This could be enhanced with ML or historical query analysis
    // For now, just return empty
    return [];
  }

  /**
   * Count total results for a query (without retrieving them)
   */
  public async countResults(query: SearchQuery): Promise<number> {
    // Query with high limit to get count
    const entries = await querySearchIndex(query, 10000, 0);

    if (!query.text) {
      return entries.length;
    }

    // Need to decrypt to count text matches
    const decrypted = await this.decryptEntries(entries);
    const filtered = this.filterByText(decrypted, query.text);

    return filtered.length;
  }
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Singleton instance
 */
let searchEngineInstance: SearchEngine | null = null;

/**
 * Get or create search engine instance
 */
export function getSearchEngine(): SearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new SearchEngine();
  }
  return searchEngineInstance;
}

/**
 * Destroy search engine instance
 */
export function destroySearchEngine(): void {
  searchEngineInstance = null;
}
