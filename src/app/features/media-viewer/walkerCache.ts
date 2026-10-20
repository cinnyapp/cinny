import type { GalleryWalker } from './galleryWalker';

/** A tiny LRU of walkers so re-opening the viewer in the same room is instant. */
export class WalkerCache {
  private max: number;

  private map = new Map<string, { walker: GalleryWalker; created: number }>();

  constructor(max = 6) {
    this.max = max;
  }

  get(key: string, maxAgeMs = 10 * 60 * 1000): GalleryWalker | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.created > maxAgeMs) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.walker;
  }

  set(key: string, walker: GalleryWalker) {
    this.map.delete(key);
    this.map.set(key, { walker, created: Date.now() });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string;
      this.map.delete(oldest);
    }
  }

  delete(key: string) {
    this.map.delete(key);
  }

  get size() {
    return this.map.size;
  }
}
