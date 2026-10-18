#!/usr/bin/env node
/**
 * Unit tests for the decrypted-media object URL cache.
 *
 *   npm run test:media-cache
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const revoked = [];
globalThis.URL.revokeObjectURL = (url) => revoked.push(url);

const { getCachedMediaUrl, setCachedMediaUrl } = await import(
  '../src/app/components/message/content/mediaCache.ts'
);

test('a cached url comes back', () => {
  setCachedMediaUrl('mxc://a/1', 'blob:one');
  assert.equal(getCachedMediaUrl('mxc://a/1'), 'blob:one');
});

test('an unknown key returns undefined', () => {
  assert.equal(getCachedMediaUrl('mxc://a/never'), undefined);
});

test('setting the same key twice keeps the first url', () => {
  setCachedMediaUrl('mxc://a/1', 'blob:other');
  assert.equal(getCachedMediaUrl('mxc://a/1'), 'blob:one');
});

test('the cache stays small and revokes what it drops', () => {
  revoked.length = 0;
  setCachedMediaUrl('mxc://a/2', 'blob:two');
  setCachedMediaUrl('mxc://a/3', 'blob:three');
  // 'mxc://a/1' is the least recently used of the three -> evicted + revoked.
  assert.ok(revoked.includes('blob:one'), 'the evicted object url must be revoked');
  assert.equal(getCachedMediaUrl('mxc://a/1'), undefined);
  assert.equal(getCachedMediaUrl('mxc://a/3'), 'blob:three');
});

test('reading an entry makes it the most recent one', () => {
  revoked.length = 0;
  setCachedMediaUrl('mxc://b/1', 'blob:b1');
  setCachedMediaUrl('mxc://b/2', 'blob:b2');
  getCachedMediaUrl('mxc://b/1'); // touch it
  setCachedMediaUrl('mxc://b/3', 'blob:b3');
  assert.equal(getCachedMediaUrl('mxc://b/1'), 'blob:b1', 'the touched entry survives');
  assert.equal(getCachedMediaUrl('mxc://b/2'), undefined, 'the untouched one was evicted');
  assert.ok(revoked.includes('blob:b2'));
});

test('a huge entry does not push the cache over its byte budget', () => {
  revoked.length = 0;
  setCachedMediaUrl('mxc://c/1', 'blob:c1', 150 * 1024 * 1024);
  setCachedMediaUrl('mxc://c/2', 'blob:c2', 150 * 1024 * 1024);
  // 300 MB > the 200 MB budget, so the older one goes.
  assert.equal(getCachedMediaUrl('mxc://c/1'), undefined);
  assert.ok(revoked.includes('blob:c1'));
});
