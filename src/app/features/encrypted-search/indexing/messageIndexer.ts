/**
 * Real-time message indexer
 * Listens to Matrix timeline events and indexes messages as they arrive
 */

import { MatrixClient, MatrixEvent, Room, RoomEvent, MatrixEventEvent } from 'matrix-js-sdk';
import { EncryptedSearchEntry, SearchableContent, AttachmentInfo, CRYPTO_CONFIG } from '../types';
import { addSearchEntry, updateMetadata, getMetadata } from '../db/encryptedSearchDB';
import { encryptSearchContent, isMasterKeyLoaded } from '../crypto/searchCrypto';

/**
 * Message indexer class
 * Singleton that manages real-time indexing
 */
export class MessageIndexer {
  private mx: MatrixClient;
  private isRunning: boolean = false;
  private eventHandlers: Map<string, (...args: any[]) => void> = new Map();

  constructor(matrixClient: MatrixClient) {
    this.mx = matrixClient;
  }

  /**
   * Start listening to timeline events
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('MessageIndexer already running');
      return;
    }

    if (!isMasterKeyLoaded()) {
      throw new Error('Master key not loaded. Initialize encryption first.');
    }

    console.log('Starting real-time message indexer...');

    // Listen to timeline events
    const timelineHandler = this.handleTimelineEvent.bind(this);
    this.mx.on(RoomEvent.Timeline, timelineHandler);
    this.eventHandlers.set('timeline', timelineHandler);

    this.isRunning = true;
    console.log('Message indexer started successfully');
  }

  /**
   * Stop listening to timeline events
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping message indexer...');

    // Remove all event listeners
    this.eventHandlers.forEach((handler, eventName) => {
      if (eventName === 'timeline') {
        this.mx.removeListener(RoomEvent.Timeline, handler);
      }
    });

    this.eventHandlers.clear();
    this.isRunning = false;
    console.log('Message indexer stopped');
  }

  /**
   * Handle timeline events
   */
  private async handleTimelineEvent(
    event: MatrixEvent,
    room: Room | undefined,
    toStartOfTimeline: boolean | undefined
  ): Promise<void> {
    // Ignore events being added to the start of the timeline (pagination)
    if (toStartOfTimeline) return;

    // Ignore if no room
    if (!room) return;

    // Ignore non-message events
    if (!this.isMessageEvent(event)) return;

    try {
      // If event is encrypted, wait for decryption
      if (event.isEncrypted()) {
        await this.handleEncryptedEvent(event, room);
      } else {
        await this.indexEvent(event, room);
      }
    } catch (error) {
      console.error('Failed to index event:', event.getId(), error);
    }
  }

  /**
   * Handle encrypted events
   * Wait for decryption before indexing
   */
  private async handleEncryptedEvent(event: MatrixEvent, room: Room): Promise<void> {
    // Check if already decrypted
    if (event.getClearContent()) {
      await this.indexEvent(event, room);
      return;
    }

    // Wait for decryption event
    const decryptionHandler = async () => {
      try {
        await this.indexEvent(event, room);
      } catch (error) {
        console.error('Failed to index decrypted event:', event.getId(), error);
      } finally {
        event.removeListener(MatrixEventEvent.Decrypted, decryptionHandler);
      }
    };

    event.on(MatrixEventEvent.Decrypted, decryptionHandler);

    // Attempt decryption if not already in progress
    const crypto = this.mx.getCrypto();
    if (crypto && event.isEncrypted()) {
      try {
        await event.attemptDecryption(crypto as any, { isRetry: true });
      } catch (error) {
        // Decryption might fail, but that's okay - we'll get it later
        console.debug('Decryption attempt failed, will retry on event:', event.getId());
      }
    }
  }

  /**
   * Index a single event
   */
  public async indexEvent(event: MatrixEvent, room: Room): Promise<void> {
    try {
      const entry = await this.createSearchEntry(event, room);
      if (!entry) return;

      await addSearchEntry(entry);

      // Update metadata
      await this.updateIndexMetadata(room.roomId, event.getId()!, event.getTs());

      console.debug('Indexed event:', event.getId());
    } catch (error) {
      console.error('Error indexing event:', event.getId(), error);
      throw error;
    }
  }

  /**
   * Create search entry from Matrix event
   */
  private async createSearchEntry(
    event: MatrixEvent,
    room: Room
  ): Promise<EncryptedSearchEntry | null> {
    const eventId = event.getId();
    const roomId = room.roomId;

    if (!eventId || !roomId) return null;

    const content = event.getContent();
    const clearContent = event.getClearContent();
    const effectiveContent = clearContent || content;

    // Extract text body
    const body = this.extractBody(effectiveContent);
    if (!body) return null; // Skip events without text content

    // Create searchable content
    const searchableContent: SearchableContent = {
      body,
      displayName: this.getDisplayName(event, room),
      roomName: room.name,
      attachments: this.extractAttachments(effectiveContent),
      links: this.extractLinks(body),
      eventType: event.getClearType?.() ?? event.getType(),
      content: this.sanitizeContent(effectiveContent),
    };

    // Encrypt the searchable content
    const { encryptedData, iv } = await encryptSearchContent(searchableContent, roomId, eventId);

    // Build the entry
    const entry: EncryptedSearchEntry = {
      id: `${roomId}:${eventId}`,
      roomId,
      eventId,
      senderId: event.getSender() || '',
      timestamp: event.getTs(),

      // State
      isEncrypted: event.isEncrypted(),
      isPinned: this.isPinned(event, room),
      isEdited: this.isEdited(event),
      isDeleted: false,

      // Mentions and references
      mentions: this.extractMentions(effectiveContent),
      replyToEventId: this.getReplyToEventId(effectiveContent),
      threadRootId: this.getThreadRootId(event),

      // Content type flags
      hasAttachment: this.hasAttachments(effectiveContent),
      hasImage: this.hasContentType(effectiveContent, 'image'),
      hasVideo: this.hasContentType(effectiveContent, 'video'),
      hasAudio: this.hasContentType(effectiveContent, 'audio'),
      hasFile: this.hasContentType(effectiveContent, 'file'),
      hasLink: searchableContent.links !== undefined && searchableContent.links.length > 0,

      // Encrypted data
      encryptedData,
      iv,

      // Crypto metadata
      cryptoVersion: CRYPTO_CONFIG.CURRENT_VERSION,

      // Sync metadata
      indexedAt: Date.now(),
    };

    return entry;
  }

  /**
   * Check if event is a message event
   */
  private isMessageEvent(event: MatrixEvent): boolean {
    const type = event.getType();
    return (
      type === 'm.room.message' ||
      type === 'm.room.encrypted' ||
      type === 'm.sticker'
    );
  }

  /**
   * Extract message body from content
   */
  private extractBody(content: any): string | null {
    // Handle different message types
    if (content.body && typeof content.body === 'string') {
      return content.body;
    }

    // For encrypted events that failed to decrypt
    if (content.msgtype === 'm.bad.encrypted') {
      return null;
    }

    return null;
  }

  /**
   * Get sender's display name
   */
  private getDisplayName(event: MatrixEvent, room: Room): string {
    const sender = event.getSender();
    if (!sender) return 'Unknown';

    const member = room.getMember(sender);
    return member?.name || sender;
  }

  /**
   * Extract attachments info
   */
  private extractAttachments(content: any): AttachmentInfo[] | undefined {
    if (!content.msgtype) return undefined;

    const attachments: AttachmentInfo[] = [];

    // File/image/video/audio attachments
    if (
      ['m.file', 'm.image', 'm.video', 'm.audio'].includes(content.msgtype) &&
      content.info
    ) {
      attachments.push({
        type: content.info.mimetype || 'application/octet-stream',
        name: content.body || 'unnamed',
        size: content.info.size || 0,
      });
    }

    return attachments.length > 0 ? attachments : undefined;
  }

  /**
   * Extract URLs from text
   */
  private extractLinks(text: string): string[] | undefined {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || undefined;
  }

  /**
   * Extract mentioned user IDs
   */
  private extractMentions(content: any): string[] {
    const mentions: string[] = [];

    // Check formatted body for mentions (HTML)
    if (content.formatted_body) {
      const mentionRegex = /https:\/\/matrix\.to\/#\/@([^"]+)/g;
      let match;
      while ((match = mentionRegex.exec(content.formatted_body)) !== null) {
        const userId = '@' + match[1];
        if (!mentions.includes(userId)) {
          mentions.push(userId);
        }
      }
    }

    // Check plain body for @mentions
    if (content.body) {
      const mentionRegex = /@([a-zA-Z0-9._=-]+:[a-zA-Z0-9.-]+)/g;
      let match;
      while ((match = mentionRegex.exec(content.body)) !== null) {
        const userId = '@' + match[1];
        if (!mentions.includes(userId)) {
          mentions.push(userId);
        }
      }
    }

    return mentions;
  }

  /**
   * Get reply-to event ID
   */
  private getReplyToEventId(content: any): string | undefined {
    return content['m.relates_to']?.['m.in_reply_to']?.event_id;
  }

  /**
   * Get thread root event ID
   */
  private getThreadRootId(event: MatrixEvent): string | undefined {
    const unsigned = event.getUnsigned();
    return unsigned?.['m.relations']?.['m.thread']?.event_id;
  }

  /**
   * Check if message is pinned
   */
  private isPinned(event: MatrixEvent, room: Room): boolean {
    const pinnedEvents = room.currentState.getStateEvents('m.room.pinned_events', '');
    if (!pinnedEvents) return false;

    const pinned: string[] = pinnedEvents.getContent().pinned || [];
    return pinned.includes(event.getId()!);
  }

  /**
   * Check if message was edited
   */
  private isEdited(event: MatrixEvent): boolean {
    const unsigned = event.getUnsigned();
    return !!unsigned?.['m.relations']?.['m.replace'];
  }

  /**
   * Check if content has attachments
   */
  private hasAttachments(content: any): boolean {
    return ['m.file', 'm.image', 'm.video', 'm.audio'].includes(content.msgtype);
  }

  /**
   * Check if content has specific type
   */
  private hasContentType(content: any, type: 'image' | 'video' | 'audio' | 'file'): boolean {
    const msgtype = content.msgtype;

    switch (type) {
      case 'image':
        return msgtype === 'm.image';
      case 'video':
        return msgtype === 'm.video';
      case 'audio':
        return msgtype === 'm.audio';
      case 'file':
        return msgtype === 'm.file';
      default:
        return false;
    }
  }

  /**
   * Sanitize content for storage
   * Remove sensitive/large fields
   */
  private sanitizeContent(content: any): any {
    const sanitized: Record<string, any> = {
      msgtype: content.msgtype,
      body: content.body,
      format: content.format,
      formatted_body: content.formatted_body,
      'm.relates_to': content['m.relates_to'],
    };

    if (content.url) {
      sanitized.url = content.url;
    }
    if (content.file) {
      sanitized.file = content.file;
    }
    if (content.info) {
      sanitized.info = content.info;
    }
    if (content.thumbnail_url) {
      sanitized.thumbnail_url = content.thumbnail_url;
    }
    if (content.thumbnail_file) {
      sanitized.thumbnail_file = content.thumbnail_file;
    }
    if (content['m.new_content']) {
      sanitized['m.new_content'] = this.sanitizeContent(content['m.new_content']);
    }

    return sanitized;
  }

  /**
   * Update indexing metadata
   */
  private async updateIndexMetadata(
    roomId: string,
    eventId: string,
    timestamp: number
  ): Promise<void> {
    const userId = this.mx.getUserId();
    if (!userId) return;

    try {
      let metadata = await getMetadata(userId);

      if (!metadata) {
        // Initialize metadata
        metadata = {
          version: 1,
          userId,
          totalIndexedEvents: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          indexingProgress: {},
        };
      }

      // Update progress for this room
      if (!metadata.indexingProgress[roomId]) {
        metadata.indexingProgress[roomId] = {
          lastEventId: eventId,
          lastTimestamp: timestamp,
          totalEvents: 1,
        };
      } else {
        metadata.indexingProgress[roomId].lastEventId = eventId;
        metadata.indexingProgress[roomId].lastTimestamp = timestamp;
        metadata.indexingProgress[roomId].totalEvents += 1;
      }

      metadata.totalIndexedEvents += 1;
      metadata.lastIndexedEventId = eventId;
      metadata.updatedAt = Date.now();

      await updateMetadata(userId, metadata);
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  }

  /**
   * Get indexer status
   */
  public getStatus(): { isRunning: boolean; handlerCount: number } {
    return {
      isRunning: this.isRunning,
      handlerCount: this.eventHandlers.size,
    };
  }
}

/**
 * Singleton instance
 */
let indexerInstance: MessageIndexer | null = null;

/**
 * Initialize the message indexer
 */
export function initMessageIndexer(matrixClient: MatrixClient): MessageIndexer {
  if (!indexerInstance) {
    indexerInstance = new MessageIndexer(matrixClient);
  }
  return indexerInstance;
}

/**
 * Get the indexer instance
 */
export function getMessageIndexer(): MessageIndexer {
  if (!indexerInstance) {
    throw new Error('Message indexer not initialized');
  }
  return indexerInstance;
}

/**
 * Destroy the indexer instance
 */
export function destroyMessageIndexer(): void {
  if (indexerInstance) {
    indexerInstance.stop();
    indexerInstance = null;
  }
}
