/**
 * Walks a room's timeline for pictures / videos / files / links, lazily.
 *
 * Nothing here talks to the SDK directly: the caller injects how to fetch a
 * `/context` window, how to fetch a `/messages` page and how to decrypt an
 * event. That keeps the walker unit-testable with synthetic pages
 * (scripts/test-media-gallery.mjs) and keeps the React side thin.
 *
 * Model
 *  - `items` are ordered OLDEST -> NEWEST (left -> right in the viewer).
 *  - `backToken` / `fwdToken` are the `/messages` pagination tokens at the two
 *    edges of what has been loaded so far; `atStart` / `atEnd` say an edge was
 *    reached.
 *  - Pages are only fetched on demand (`ensureAround`, `loadOlder`,
 *    `loadNewer`), never preloaded, so a 9,000-room account pays nothing until
 *    a viewer is actually open, and then only for that one room.
 *  - For unencrypted rooms the server does the filtering (`contains_url`), so a
 *    page is almost all media. For encrypted rooms the server cannot see inside
 *    `m.room.encrypted`, so pages are decrypted and classified client-side; a
 *    page with no media just triggers the next one (bounded per call).
 */

export type RawEvent = {
  event_id: string;
  type: string;
  sender: string;
  origin_server_ts: number;
  content: Record<string, any>;
  unsigned?: Record<string, any>;
  state_key?: string;
  room_id?: string;
};

export type GalleryCategory = 'media' | 'files' | 'links';
export type GalleryKind = 'image' | 'video' | 'sticker' | 'file' | 'audio' | 'link';

export type GalleryItem = {
  eventId: string;
  ts: number;
  sender: string;
  kind: GalleryKind;
  body: string;
  filename?: string;
  mxc?: string;
  /** EncryptedFile (content.file) for encrypted attachments. */
  encInfo?: Record<string, any>;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  thumbMxc?: string;
  thumbEnc?: Record<string, any>;
  thumbMime?: string;
  links?: string[];
};

export type ClassifyOptions = {
  category: GalleryCategory;
  includeStickers?: boolean;
};

const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}]/gi;

export const extractLinks = (text: unknown): string[] => {
  if (typeof text !== 'string') return [];
  const found = text.match(URL_RE) ?? [];
  return Array.from(new Set(found));
};

const isMxc = (v: unknown): v is string => typeof v === 'string' && v.startsWith('mxc://');

/**
 * Turns one (already decrypted) event into a gallery item, or undefined when it
 * does not belong in the requested category. Edits, redactions and anything
 * without a usable mxc URL are dropped.
 */
export const classifyEvent = (ev: RawEvent, opts: ClassifyOptions): GalleryItem | undefined => {
  if (!ev || typeof ev !== 'object' || !ev.content) return undefined;
  const { content } = ev;
  if (ev.unsigned?.redacted_because) return undefined;
  const relType = content['m.relates_to']?.rel_type;
  if (relType === 'm.replace') return undefined;

  const base = {
    eventId: ev.event_id,
    ts: ev.origin_server_ts,
    sender: ev.sender,
    body: typeof content.body === 'string' ? content.body : '',
    filename: typeof content.filename === 'string' ? content.filename : undefined,
  };

  if (ev.type === 'm.sticker') {
    if (opts.category !== 'media' || !opts.includeStickers) return undefined;
    if (!isMxc(content.url)) return undefined;
    return {
      ...base,
      kind: 'sticker',
      mxc: content.url,
      mimeType: content.info?.mimetype,
      width: content.info?.w,
      height: content.info?.h,
    };
  }

  if (ev.type !== 'm.room.message') return undefined;
  const { msgtype } = content;

  if (opts.category === 'links') {
    if (msgtype !== 'm.text' && msgtype !== 'm.notice' && msgtype !== 'm.emote') return undefined;
    const links = extractLinks(content.body);
    if (links.length === 0) return undefined;
    return { ...base, kind: 'link', links };
  }

  const mxc = isMxc(content.url) ? content.url : content.file?.url;
  if (!isMxc(mxc)) return undefined;
  const encInfo = isMxc(content.file?.url) ? content.file : undefined;
  const info = content.info ?? {};
  const media = {
    ...base,
    mxc,
    encInfo,
    mimeType: typeof info.mimetype === 'string' ? info.mimetype : undefined,
    width: typeof info.w === 'number' ? info.w : undefined,
    height: typeof info.h === 'number' ? info.h : undefined,
    size: typeof info.size === 'number' ? info.size : undefined,
    duration: typeof info.duration === 'number' ? info.duration : undefined,
    thumbMxc: isMxc(info.thumbnail_url) ? info.thumbnail_url : info.thumbnail_file?.url,
    thumbEnc: isMxc(info.thumbnail_file?.url) ? info.thumbnail_file : undefined,
    thumbMime: info.thumbnail_info?.mimetype,
  };

  if (opts.category === 'media') {
    if (msgtype === 'm.image') return { ...media, kind: 'image' };
    if (msgtype === 'm.video') return { ...media, kind: 'video' };
    return undefined;
  }
  // files
  if (msgtype === 'm.file') return { ...media, kind: 'file' };
  if (msgtype === 'm.audio') return { ...media, kind: 'audio' };
  return undefined;
};

/** The RoomEventFilter sent with /context and /messages. */
export const buildRoomEventFilter = (
  category: GalleryCategory,
  encrypted: boolean,
  includeStickers?: boolean
): Record<string, unknown> => {
  const types = ['m.room.message'];
  if (category === 'media' && includeStickers) types.push('m.sticker');
  if (encrypted) types.push('m.room.encrypted');
  const filter: Record<string, unknown> = { types, lazy_load_members: true };
  // The server can only see `url` on cleartext events; asking it to filter on
  // contains_url in an encrypted room would drop every encrypted picture.
  if (!encrypted && category !== 'links') filter.contains_url = true;
  return filter;
};

export type MessagesPage = { chunk: RawEvent[]; start?: string; end?: string };
export type ContextPage = {
  event?: RawEvent;
  events_before?: RawEvent[];
  events_after?: RawEvent[];
  start?: string;
  end?: string;
};

export type WalkerDeps = {
  fetchPage: (dir: 'b' | 'f', from: string | undefined, limit: number) => Promise<MessagesPage>;
  fetchContext?: (eventId: string, limit: number) => Promise<ContextPage>;
  /** Decrypts (if needed) and returns the cleartext event; may return the input. */
  decrypt?: (ev: RawEvent) => Promise<RawEvent>;
  classify: (ev: RawEvent) => GalleryItem | undefined;
  pageLimit?: number;
  /** Max pages fetched by one loadOlder/loadNewer call when pages contain no items. */
  maxPagesPerCall?: number;
};

export type WalkerSnapshot = {
  items: GalleryItem[];
  atStart: boolean;
  atEnd: boolean;
  loadingOlder: boolean;
  loadingNewer: boolean;
  initialized: boolean;
  error?: string;
  version: number;
};

export class GalleryWalker {
  private deps: WalkerDeps;

  private items: GalleryItem[] = [];

  private ids = new Set<string>();

  private backToken?: string;

  private fwdToken?: string;

  private atStart = false;

  private atEnd = false;

  private loadingOlder?: Promise<number>;

  private loadingNewer?: Promise<number>;

  private initialized = false;

  private initPromise?: Promise<void>;

  private error?: string;

  private version = 0;

  private snapshot: WalkerSnapshot;

  private listeners = new Set<() => void>();

  /** Number of /context + /messages requests made (for tests and diagnostics). */
  requests = 0;

  constructor(deps: WalkerDeps) {
    this.deps = deps;
    this.snapshot = this.makeSnapshot();
  }

  private makeSnapshot(): WalkerSnapshot {
    return {
      items: this.items,
      atStart: this.atStart,
      atEnd: this.atEnd,
      loadingOlder: !!this.loadingOlder,
      loadingNewer: !!this.loadingNewer,
      initialized: this.initialized,
      error: this.error,
      version: this.version,
    };
  }

  private emit() {
    this.version += 1;
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach((l) => l());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): WalkerSnapshot => this.snapshot;

  has(eventId: string): boolean {
    return this.ids.has(eventId);
  }

  indexOf(eventId: string): number {
    return this.items.findIndex((it) => it.eventId === eventId);
  }

  private async toItems(events: RawEvent[]): Promise<GalleryItem[]> {
    const out: GalleryItem[] = [];
    const { decrypt, classify } = this.deps;
    const clear = decrypt
      ? await Promise.all(events.map((e) => decrypt(e).catch(() => e)))
      : events;
    clear.forEach((ev) => {
      if (!ev || this.ids.has(ev.event_id)) return;
      const item = classify(ev);
      if (item) out.push(item);
    });
    return out;
  }

  private addOlder(older: GalleryItem[]) {
    // `older` is oldest -> newest
    const fresh = older.filter((it) => !this.ids.has(it.eventId));
    fresh.forEach((it) => this.ids.add(it.eventId));
    if (fresh.length) this.items = [...fresh, ...this.items];
    return fresh.length;
  }

  private addNewer(newer: GalleryItem[]) {
    const fresh = newer.filter((it) => !this.ids.has(it.eventId));
    fresh.forEach((it) => this.ids.add(it.eventId));
    if (fresh.length) this.items = [...this.items, ...fresh];
    return fresh.length;
  }

  /** Show something immediately (the event the user tapped) before the server answers. */
  seed(item: GalleryItem) {
    if (this.ids.has(item.eventId)) return;
    this.ids.add(item.eventId);
    this.items = [...this.items, item].sort((a, b) => a.ts - b.ts);
    this.emit();
  }

  /**
   * Start around `anchorEventId` (via /context), or at the newest end of the
   * room when no anchor is given (the Media grid).
   */
  init(anchorEventId?: string): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const limit = this.deps.pageLimit ?? 50;
      try {
        if (anchorEventId && this.deps.fetchContext) {
          this.requests += 1;
          const ctx = await this.deps.fetchContext(anchorEventId, limit);
          // events_before is newest -> oldest (reverse-chronological)
          const before = [...(ctx.events_before ?? [])].reverse();
          const after = ctx.events_after ?? [];
          const all = [...before, ...(ctx.event ? [ctx.event] : []), ...after];
          const items = await this.toItems(all);
          // merge with any seeded item, keep order by timestamp
          items.forEach((it) => this.ids.add(it.eventId));
          this.items = [
            ...this.items.filter((s) => !items.some((i) => i.eventId === s.eventId)),
            ...items,
          ].sort((a, b) => a.ts - b.ts);
          this.items.forEach((it) => this.ids.add(it.eventId));
          this.backToken = ctx.start;
          this.fwdToken = ctx.end;
          if (!ctx.start) this.atStart = true;
          if (!ctx.end) this.atEnd = true;
        } else {
          // From the live end backwards.
          this.atEnd = true;
          this.initialized = true;
          this.emit();
          await this.loadOlder();
          return;
        }
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e);
      }
      this.initialized = true;
      this.emit();
    })();
    return this.initPromise;
  }

  /** Loads one more batch of older items. Resolves to how many were added. */
  loadOlder(): Promise<number> {
    if (this.atStart) return Promise.resolve(0);
    if (this.loadingOlder) return this.loadingOlder;
    const run = async () => {
      const limit = this.deps.pageLimit ?? 50;
      const maxPages = this.deps.maxPagesPerCall ?? 6;
      let added = 0;
      for (let i = 0; i < maxPages && !this.atStart; i += 1) {
        this.requests += 1;
        // eslint-disable-next-line no-await-in-loop
        const page = await this.deps.fetchPage('b', this.backToken, limit);
        const chunk = page.chunk ?? [];
        // chunk is newest -> oldest for dir=b
        // eslint-disable-next-line no-await-in-loop
        const items = await this.toItems([...chunk].reverse());
        added += this.addOlder(items);
        if (!page.end || chunk.length === 0 || page.end === this.backToken) {
          this.atStart = true;
        } else {
          this.backToken = page.end;
        }
        if (added > 0) break;
      }
      return added;
    };
    this.loadingOlder = run()
      .catch((e) => {
        this.error = e instanceof Error ? e.message : String(e);
        return 0;
      })
      .finally(() => {
        this.loadingOlder = undefined;
        this.emit();
      });
    this.emit();
    return this.loadingOlder;
  }

  /** Loads one more batch of newer items. Resolves to how many were added. */
  loadNewer(): Promise<number> {
    if (this.atEnd) return Promise.resolve(0);
    if (this.loadingNewer) return this.loadingNewer;
    const run = async () => {
      const limit = this.deps.pageLimit ?? 50;
      const maxPages = this.deps.maxPagesPerCall ?? 6;
      let added = 0;
      for (let i = 0; i < maxPages && !this.atEnd; i += 1) {
        this.requests += 1;
        // eslint-disable-next-line no-await-in-loop
        const page = await this.deps.fetchPage('f', this.fwdToken, limit);
        const chunk = page.chunk ?? [];
        // eslint-disable-next-line no-await-in-loop
        const items = await this.toItems(chunk);
        added += this.addNewer(items);
        if (chunk.length === 0 || !page.end || page.end === this.fwdToken) {
          this.atEnd = true;
          if (page.end) this.fwdToken = page.end;
        } else {
          this.fwdToken = page.end;
        }
        if (added > 0) break;
      }
      return added;
    };
    this.loadingNewer = run()
      .catch((e) => {
        this.error = e instanceof Error ? e.message : String(e);
        return 0;
      })
      .finally(() => {
        this.loadingNewer = undefined;
        this.emit();
      });
    this.emit();
    return this.loadingNewer;
  }

  /**
   * Re-opened later: the newest edge may have grown (new pictures arrived).
   * Allows one more forward pass from the last token.
   */
  refreshNewest() {
    if (this.fwdToken && this.atEnd) {
      this.atEnd = false;
      this.loadNewer();
    }
  }

  /** Loads more when `index` is within `margin` of a not-yet-reached edge. */
  ensureAround(index: number, margin = 4) {
    if (!this.initialized) return;
    if (index <= margin && !this.atStart) this.loadOlder();
    if (index >= this.items.length - 1 - margin && !this.atEnd) this.loadNewer();
  }
}
