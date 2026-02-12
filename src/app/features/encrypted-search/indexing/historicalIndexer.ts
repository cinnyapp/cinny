/**
 * Historical message indexer
 * Indexes past messages in the background
 */

import { MatrixClient, Room, EventTimeline, Direction } from 'matrix-js-sdk';
import { IndexingProgressEvent, INDEXING_CONFIG } from '../types';
import { getMetadata, updateMetadata, getRoomIndexedMessageCount } from '../db/encryptedSearchDB';
import { getMessageIndexer } from './messageIndexer';
import { isMasterKeyLoaded } from '../crypto/searchCrypto';

/**
 * Progress callback type
 */
export type ProgressCallback = (event: IndexingProgressEvent) => void;

/**
 * Historical indexer class
 * Indexes messages from room history
 */
export class HistoricalIndexer {
  private mx: MatrixClient;
  private isIndexing: boolean = false;
  private shouldStop: boolean = false;
  private progressCallback?: ProgressCallback;

  constructor(matrixClient: MatrixClient) {
    this.mx = matrixClient;
  }

  /**
   * Start indexing all rooms
   */
  public async indexAllRooms(progressCallback?: ProgressCallback): Promise<void> {
    if (this.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    if (!isMasterKeyLoaded()) {
      throw new Error('Master key not loaded');
    }

    this.isIndexing = true;
    this.shouldStop = false;
    this.progressCallback = progressCallback;

    const userId = this.mx.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Starting historical indexing for all rooms...');

      // Get all joined rooms
      const rooms = this.mx.getRooms();
      const totalRooms = rooms.length;
      let processedRooms = 0;

      for (const room of rooms) {
        if (this.shouldStop) {
          console.log('Indexing stopped by user');
          break;
        }

        try {
          await this.indexRoom(room);
          processedRooms++;

          this.emitProgress({
            type: 'progress',
            roomId: room.roomId,
            processed: processedRooms,
            total: totalRooms,
          });
        } catch (error) {
          console.error(`Failed to index room ${room.roomId}:`, error);
          this.emitProgress({
            type: 'error',
            roomId: room.roomId,
            processed: processedRooms,
            total: totalRooms,
            error: error as Error,
          });
        }
      }

      console.log('Historical indexing completed');
      this.emitProgress({
        type: 'complete',
        processed: processedRooms,
        total: totalRooms,
      });
    } finally {
      this.isIndexing = false;
      this.progressCallback = undefined;
    }
  }

  /**
   * Index a single room
   */
  public async indexRoom(room: Room): Promise<void> {
    if (!isMasterKeyLoaded()) {
      throw new Error('Master key not loaded');
    }

    const roomId = room.roomId;
    const userId = this.mx.getUserId();

    if (!userId) {
      throw new Error('User not authenticated');
    }

    console.log(`Indexing room: ${room.name || roomId}`);

    // Check if room is already indexed
    const metadata = await getMetadata(userId);
    const roomProgress = metadata?.indexingProgress[roomId];

    let processedCount = 0;
    let lastEventId: string | undefined;
    let lastTimestamp = 0;

    // Get timeline
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    if (events.length === 0) {
      console.log(`Room ${roomId} has no events`);
      return;
    }

    // Index loaded events first
    const messageIndexer = getMessageIndexer();

    for (const event of events) {
      if (this.shouldStop) break;

      try {
        await messageIndexer.indexEvent(event, room);
        processedCount++;
        lastEventId = event.getId() || lastEventId;
        lastTimestamp = event.getTs();
      } catch (error) {
        console.debug(`Failed to index event ${event.getId()}:`, error);
      }
    }

    // Paginate backwards to get more history
    let hasMore = true;
    let retries = 0;

    while (hasMore && !this.shouldStop && retries < INDEXING_CONFIG.MAX_RETRY_ATTEMPTS) {
      try {
        const canPaginate = await this.canPaginateTimeline(timeline);

        if (!canPaginate) {
          hasMore = false;
          break;
        }

        // Paginate backwards
        const paginateResult = await this.mx.paginateEventTimeline(timeline, {
          backwards: true,
          limit: INDEXING_CONFIG.BATCH_SIZE,
        });

        if (!paginateResult) {
          hasMore = false;
          break;
        }

        // Index the new events
        const newEvents = timeline.getEvents();

        for (const event of newEvents) {
          if (this.shouldStop) break;

          // Skip if already indexed
          const eventId = event.getId();
          if (eventId === lastEventId) continue;

          try {
            await messageIndexer.indexEvent(event, room);
            processedCount++;
            lastEventId = eventId || lastEventId;
            lastTimestamp = event.getTs();
          } catch (error) {
            console.debug(`Failed to index event ${eventId}:`, error);
          }
        }

        // Check if we're at the start
        if (newEvents.length < INDEXING_CONFIG.BATCH_SIZE) {
          hasMore = false;
        }

        // Small delay to avoid overwhelming the client
        await this.delay(100);
      } catch (error) {
        console.error(`Pagination error in room ${roomId}:`, error);
        retries++;

        if (retries >= INDEXING_CONFIG.MAX_RETRY_ATTEMPTS) {
          hasMore = false;
        } else {
          await this.delay(1000 * retries); // Exponential backoff
        }
      }
    }

    console.log(`Indexed ${processedCount} events in room ${roomId}`);
  }

  /**
   * Check if timeline can be paginated
   */
  private async canPaginateTimeline(timeline: EventTimeline): Promise<boolean> {
    try {
      const state = timeline.getPaginationToken(Direction.Backward);
      return state !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Index specific rooms
   */
  public async indexRooms(
    roomIds: string[],
    progressCallback?: ProgressCallback
  ): Promise<void> {
    if (this.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    this.isIndexing = true;
    this.shouldStop = false;
    this.progressCallback = progressCallback;

    try {
      const totalRooms = roomIds.length;
      let processedRooms = 0;

      for (const roomId of roomIds) {
        if (this.shouldStop) break;

        const room = this.mx.getRoom(roomId);
        if (!room) {
          console.warn(`Room ${roomId} not found`);
          continue;
        }

        try {
          await this.indexRoom(room);
          processedRooms++;

          this.emitProgress({
            type: 'progress',
            roomId,
            processed: processedRooms,
            total: totalRooms,
          });
        } catch (error) {
          console.error(`Failed to index room ${roomId}:`, error);
          this.emitProgress({
            type: 'error',
            roomId,
            processed: processedRooms,
            total: totalRooms,
            error: error as Error,
          });
        }
      }

      this.emitProgress({
        type: 'complete',
        processed: processedRooms,
        total: totalRooms,
      });
    } finally {
      this.isIndexing = false;
      this.progressCallback = undefined;
    }
  }

  /**
   * Stop indexing
   */
  public stop(): void {
    if (this.isIndexing) {
      console.log('Stopping historical indexing...');
      this.shouldStop = true;
    }
  }

  /**
   * Get indexing status
   */
  public getStatus(): { isIndexing: boolean } {
    return {
      isIndexing: this.isIndexing,
    };
  }

  /**
   * Emit progress event
   */
  private emitProgress(event: IndexingProgressEvent): void {
    if (this.progressCallback) {
      this.progressCallback(event);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimate remaining time
   */
  public async estimateIndexingTime(): Promise<{
    totalMessages: number;
    indexedMessages: number;
    remainingMessages: number;
    estimatedMinutes: number;
  }> {
    const userId = this.mx.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const rooms = this.mx.getRooms();
    let totalMessages = 0;

    // Estimate total messages across all rooms
    rooms.forEach((room) => {
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();
      totalMessages += events.length;

      // Rough estimate: assume 100 more messages per room if timeline not fully loaded
      const canPaginate = timeline.getPaginationToken(Direction.Backward);
      if (canPaginate) {
        totalMessages += 100;
      }
    });

    // Get currently indexed count
    const indexedMessages = await getIndexedMessageCount();

    const remainingMessages = Math.max(0, totalMessages - indexedMessages);

    // Estimate: ~100 messages per minute
    const estimatedMinutes = Math.ceil(remainingMessages / 100);

    return {
      totalMessages,
      indexedMessages,
      remainingMessages,
      estimatedMinutes,
    };
  }
}

/**
 * Get indexed message count
 */
async function getIndexedMessageCount(): Promise<number> {
  const { getIndexedMessageCount: getCount } = await import('../db/encryptedSearchDB');
  return getCount();
}

/**
 * Singleton instance
 */
let historicalIndexerInstance: HistoricalIndexer | null = null;

/**
 * Initialize historical indexer
 */
export function initHistoricalIndexer(matrixClient: MatrixClient): HistoricalIndexer {
  if (!historicalIndexerInstance) {
    historicalIndexerInstance = new HistoricalIndexer(matrixClient);
  }
  return historicalIndexerInstance;
}

/**
 * Get historical indexer instance
 */
export function getHistoricalIndexer(): HistoricalIndexer {
  if (!historicalIndexerInstance) {
    throw new Error('Historical indexer not initialized');
  }
  return historicalIndexerInstance;
}

/**
 * Destroy historical indexer
 */
export function destroyHistoricalIndexer(): void {
  if (historicalIndexerInstance) {
    historicalIndexerInstance.stop();
    historicalIndexerInstance = null;
  }
}
