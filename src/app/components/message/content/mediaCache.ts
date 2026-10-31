/**
 * A tiny cache of object URLs for media that had to be downloaded (and, for an
 * encrypted room, decrypted) before it could be played.
 *
 * Re-opening the same video used to download and decrypt it all over again.
 * The cache is deliberately tiny — these entries hold the whole file in memory
 * — and the oldest entry's object URL is revoked when it is evicted, so the
 * memory is actually given back.
 */
const MAX_ENTRIES = 2;
const MAX_BYTES = 200 * 1024 * 1024;

type Entry = {
  objectUrl: string;
  bytes: number;
};

const cache = new Map<string, Entry>();
let totalBytes = 0;

const evictOldest = () => {
  const oldest = cache.keys().next();
  if (oldest.done) return;
  const entry = cache.get(oldest.value);
  cache.delete(oldest.value);
  if (entry) {
    totalBytes -= entry.bytes;
    URL.revokeObjectURL(entry.objectUrl);
  }
};

export const getCachedMediaUrl = (key: string): string | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  // Refresh its position so the least recently used one is evicted first.
  cache.delete(key);
  cache.set(key, entry);
  return entry.objectUrl;
};

export const setCachedMediaUrl = (key: string, objectUrl: string, bytes = 0): void => {
  if (cache.has(key)) return;
  cache.set(key, { objectUrl, bytes });
  totalBytes += bytes;
  while (cache.size > MAX_ENTRIES || totalBytes > MAX_BYTES) {
    if (cache.size <= 1) break;
    evictOldest();
  }
};
