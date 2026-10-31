#!/usr/bin/env node
/**
 * Regression tests for the 2026-10-20 "Failed to load image" / console-noise fixes.
 *
 *  - media auth: a 401 from a not-service-worker-controlled page is retried with
 *    the page's own token (only for our homeserver's media URLs), failures are
 *    classified (missing / unauthorized / server / network) for the UI;
 *  - the service worker claims an uncontrolled (hard-reloaded) page on request;
 *  - call-session listeners: 20 room rows mounted/unmounted 20 times keep the
 *    client's session manager at ONE listener per event (and zero after);
 *  - link previews: Markdown links in a body yield the real target URL;
 *    failed previews / timed-out sites are not re-requested;
 *  - OIDC metadata probe is skipped for a day after a 404.
 *
 *   npm run test:media-errors
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'https://cinny.test/',
});
const { window } = dom;
const g = globalThis;
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in g) continue;
  try {
    g[key] = window[key];
  } catch {
    /* read-only */
  }
}
g.window = window;
g.document = window.document;
g.IS_REACT_ACT_ENVIRONMENT = true;
g.MessageChannel = class {
  constructor() {
    const port1 = { onmessage: null, close() {} };
    this.port1 = port1;
    this.port2 = {
      postMessage: (data) => setImmediate(() => port1.onmessage?.({ data })),
      close() {},
    };
  }
};

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinny-me-'));
const common = {
  bundle: true,
  format: 'esm',
  loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty' },
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  jsx: 'transform',
  logLevel: 'error',
};
await build({
  ...common,
  entryPoints: [path.join(ROOT, 'scripts/fixtures/media-errors.fixture.tsx')],
  platform: 'node',
  outfile: path.join(outDir, 'fixture.mjs'),
});
await build({
  ...common,
  entryPoints: [path.join(ROOT, 'src/sw.ts')],
  platform: 'browser',
  outfile: path.join(outDir, 'sw.mjs'),
});
const fx = await import(pathToFileURL(path.join(outDir, 'fixture.mjs')).href);

// ---- media auth --------------------------------------------------------------
const HS = 'https://mx.example.org';
const session = { baseUrl: HS, accessToken: 'tok' };
const MEDIA = `${HS}/_matrix/client/v1/media/download/example.org/abc?allow_redirect=true`;

const fakeFetch = (handler) => {
  const calls = [];
  const impl = async (url, init = {}) => {
    const auth = new Headers(init.headers).get('Authorization');
    calls.push({ url, auth });
    const status = handler(url, auth);
    if (status === 'throw') throw new TypeError('Failed to fetch');
    return new Response(status === 200 ? 'JPEG' : '{}', { status });
  };
  return { impl, calls };
};

test('media: a 401 (service worker did not add the token) is retried with the page token', async () => {
  const f = fakeFetch((url, auth) => (auth === 'Bearer tok' ? 200 : 401));
  const res = await fx.fetchMediaResponse(MEDIA, () => session, {}, f.impl);
  assert.equal(res.status, 200);
  assert.deepEqual(
    f.calls.map((c) => c.auth),
    [null, 'Bearer tok']
  );
});

test('media: when the page is known to be uncontrolled the token goes on the first request', async () => {
  const f = fakeFetch((url, auth) => (auth === 'Bearer tok' ? 200 : 401));
  await fx.fetchMediaResponse(MEDIA, () => session, {}, f.impl, true);
  assert.deepEqual(
    f.calls.map((c) => c.auth),
    ['Bearer tok']
  );
});

test('media: the token is never sent to another host', async () => {
  const other = 'https://evil.example.com/_matrix/client/v1/media/download/x/y';
  const f = fakeFetch(() => 401);
  await assert.rejects(
    fx.fetchMediaResponse(other, () => session, {}, f.impl, true),
    (e) => {
      assert.equal(e.kind, 'unauthorized');
      return true;
    }
  );
  assert.ok(f.calls.every((c) => c.auth === null));
  assert.equal(fx.tokenForMediaUrl(`${HS}/_matrix/client/v3/sync`, session), undefined);
});

test('media: failures are classified for the UI', async () => {
  for (const [status, kind] of [
    [404, 'missing'],
    [410, 'missing'],
    [403, 'unauthorized'],
    [502, 'server'],
    [429, 'server'],
    ['throw', 'network'],
  ]) {
    const f = fakeFetch(() => status);
    // eslint-disable-next-line no-await-in-loop
    await assert.rejects(
      fx.fetchMediaResponse(MEDIA, () => session, {}, f.impl),
      (e) => {
        assert.ok(e instanceof fx.MediaLoadError);
        assert.equal(e.kind, kind, `status ${status}`);
        return true;
      }
    );
  }
  assert.match(fx.describeMediaFailure('missing', 'picture'), /no longer on the server/);
  assert.equal(fx.getMediaFailureKind(new Error('x')), 'network');
});

// ---- service worker: claim -----------------------------------------------------
test('service worker: a {type:"claim"} message makes it claim the page (hard reload fix)', async () => {
  const listeners = {};
  let claims = 0;
  const waited = [];
  g.self = {
    addEventListener: (type, cb) => {
      listeners[type] = cb;
    },
    skipWaiting: () => {},
    clients: {
      claim: async () => {
        claims += 1;
      },
      matchAll: async () => [],
      get: async () => undefined,
    },
    caches: { open: async () => ({ match: async () => undefined, put: async () => {} }) },
  };
  await import(`${pathToFileURL(path.join(outDir, 'sw.mjs')).href}?claim`);
  listeners.message({
    source: { id: 'client-1' },
    data: { type: 'claim' },
    waitUntil: (p) => waited.push(p),
  });
  await Promise.all(waited);
  assert.equal(claims, 1);
  assert.equal(waited.length, 1, 'kept alive until the claim finished');
});

// ---- call session listeners ------------------------------------------------------
const tick = () => fx.act(async () => new Promise((r) => setTimeout(r, 5)));

test('call sessions: 20 rows x 20 mount/unmount cycles keep ONE listener per event', async () => {
  const mx = fx.makeFakeClient();
  const rtc = mx.matrixRTC;
  for (let cycle = 0; cycle < 20; cycle += 1) {
    const m = fx.mountRows(mx, 20);
    // eslint-disable-next-line no-await-in-loop
    await tick();
    assert.equal(rtc.listenerCount('session_started'), 1, `cycle ${cycle}: session_started`);
    assert.equal(rtc.listenerCount('session_ended'), 1, `cycle ${cycle}: session_ended`);
    m.unmount();
    assert.equal(rtc.listenerCount('session_started'), 0, `cycle ${cycle}: removed on unmount`);
    assert.equal(rtc.listenerCount('session_ended'), 0, `cycle ${cycle}: removed on unmount`);
  }
});

test('call sessions: an event reaches only the rows of that room', async () => {
  const mx = fx.makeFakeClient();
  const m = fx.mountRows(mx, 20);
  await tick();
  const before = { ...m.seen };
  await fx.act(async () => {
    mx.matrixRTC.emit('session_started', '!r7:test');
  });
  await tick();
  assert.ok(m.seen['!r7:test'] > before['!r7:test'], 'room 7 picked up the new session');
  for (const id of Object.keys(before)) {
    if (id !== '!r7:test') assert.equal(m.seen[id], before[id], `${id} untouched`);
  }
  m.unmount();
});

test('call sessions: subscription helper is idempotent on unsubscribe', () => {
  const em = {
    l: new Map(),
    on(e, f) {
      this.l.set(e, (this.l.get(e) ?? 0) + 1);
      this.f = f;
    },
    off(e) {
      this.l.set(e, (this.l.get(e) ?? 0) - 1);
    },
  };
  const a = fx.subscribeRoomCallSession(em, ['x'], '!a', () => {});
  const b = fx.subscribeRoomCallSession(em, ['x'], '!b', () => {});
  assert.equal(em.l.get('x'), 1);
  a();
  a();
  assert.equal(em.l.get('x'), 1);
  b();
  assert.equal(em.l.get('x'), 0);
});

// ---- link previews -----------------------------------------------------------------
test('previews: the Instagram bridge Markdown-link body yields the real target only', () => {
  const ig =
    'https://www.instagram.com/reel/DeonUkAMs8B/?id=4010628405034929921_54726604913&is_sponsored=false&is_ineligible_for_clips_chaining=false';
  const body = `[https://www.instagram.com/reel/DeonUkAMs8B/](${ig})`;
  assert.deepEqual(fx.extractPreviewUrls(body), [ig]);
  assert.ok(fx.extractPreviewUrls(body).every((u) => !u.includes('](')));
});

test('previews: plain URLs still found; a stray "](" never becomes part of a URL', () => {
  assert.deepEqual(fx.extractPreviewUrls('see https://a.example/x, and (https://b.example/y).'), [
    'https://a.example/x',
    'https://b.example/y',
  ]);
  const broken = fx.extractPreviewUrls('https://a.example/one](https://a.example/two');
  assert.ok(
    broken.every((u) => !u.includes(']')),
    JSON.stringify(broken)
  );
  assert.deepEqual(fx.extractPreviewUrls('twice https://a.example/x https://a.example/x'), [
    'https://a.example/x',
  ]);
});

test('previews: failures are not re-requested; a timed-out site is parked', async () => {
  let t = 1_000_000;
  const cache = fx.createUrlPreviewCache(() => t);
  let calls = 0;
  const timeout = () => {
    calls += 1;
    return Promise.reject(Object.assign(new Error('504'), { httpStatus: 504 }));
  };
  await assert.rejects(cache.get('https://www.galaxus.ch/a', timeout));
  await assert.rejects(cache.get('https://www.galaxus.ch/a', timeout), fx.UrlPreviewSkipped);
  await assert.rejects(cache.get('https://www.galaxus.ch/other', timeout), fx.UrlPreviewSkipped);
  assert.equal(calls, 1, 'one request for the whole site');
  t += 11 * 60 * 1000; // host parking expires, the url-level one (30 min) does not
  await assert.rejects(cache.get('https://www.galaxus.ch/other', timeout));
  await assert.rejects(cache.get('https://www.galaxus.ch/a', timeout), fx.UrlPreviewSkipped);
  assert.equal(calls, 2);

  let okCalls = 0;
  const okFetch = () => {
    okCalls += 1;
    return Promise.resolve({ 'og:title': 'x' });
  };
  const [a, b] = await Promise.all([
    cache.get('https://ok.example/', okFetch),
    cache.get('https://ok.example/', okFetch),
  ]);
  await cache.get('https://ok.example/', okFetch);
  assert.equal(okCalls, 1, 'shared in-flight request and cached result');
  assert.deepEqual(a, b);

  let nf = 0;
  const notFound = () => {
    nf += 1;
    return Promise.reject(Object.assign(new Error('502'), { httpStatus: 502 }));
  };
  await assert.rejects(cache.get('https://site.example/gone', notFound));
  await assert.rejects(
    cache.get('https://site.example/fine', okFetch).then(() => {
      throw new Error('ok');
    })
  );
  assert.equal(nf, 1);
  assert.equal(okCalls, 2, 'a 502 on one URL does not park the whole site');
});

// ---- OIDC probe --------------------------------------------------------------------
test('auth metadata: a 404 is remembered for a day per homeserver', async () => {
  const mem = new Map();
  const store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  let t = 5_000;
  let calls = 0;
  const notThere = () => {
    calls += 1;
    return Promise.reject(
      Object.assign(new Error('nope'), { httpStatus: 404, errcode: 'M_UNRECOGNIZED' })
    );
  };
  assert.equal(await fx.probeAuthMetadata(HS, notThere, store, () => t), undefined);
  assert.equal(await fx.probeAuthMetadata(HS, notThere, store, () => t), undefined);
  assert.equal(calls, 1);
  assert.equal(await fx.probeAuthMetadata('https://other.hs', notThere, store, () => t), undefined);
  assert.equal(calls, 2, 'per homeserver');
  t += fx.AUTH_METADATA_ABSENT_TTL_MS + 1;
  await fx.probeAuthMetadata(HS, notThere, store, () => t);
  assert.equal(calls, 3, 'asked again after a day');
  const boom = () => Promise.reject(Object.assign(new Error('down'), { httpStatus: 502 }));
  await assert.rejects(fx.probeAuthMetadata('https://x.hs', boom, store, () => t));
  assert.deepEqual(await fx.probeAuthMetadata('https://y.hs', async () => ({ ok: 1 }), store), {
    ok: 1,
  });
});

test.after(() => {
  window.close();
});
