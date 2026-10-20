#!/usr/bin/env node
/**
 * Regression tests: Cinny must never die on one broken popup or message.
 *
 *  1. CONTROL — the raw focus-trap-react with an empty popup body still throws
 *     "must have at least one container with at least one tabbable node"
 *     (proves the test reproduces the crash the 🎤 button caused).
 *  2. The shared SafeFocusTrap wrapper mounts an EMPTY popup with every
 *     focusTrapOptions shape used in the app (transcribe, translation,
 *     message menu / mark-irrelevant, emoji picker, room settings, ...) without
 *     throwing and without showing an error box.
 *  3. A component that throws INSIDE a popup shows the popup fallback
 *     (Retry / Report / Close); its siblings keep rendering; Close calls the
 *     popup's onDeactivate.
 *  4. A message that throws in the timeline is replaced by a one-line fallback,
 *     the messages around it still render, and Retry brings it back once it
 *     renders again.
 *  5. Static audit: no file imports focus-trap-react directly (everything goes
 *     through the wrapper), and the timeline / room view / settings / router
 *     keep their boundaries.
 *
 *   npm run test:error-boundaries
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

// ---- a browser-ish global environment -------------------------------------
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
Object.defineProperty(g, 'navigator', { value: window.navigator, configurable: true });
g.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;
// React's act() queues work through a MessageChannel; Node's real one keeps
// the process alive forever. A setImmediate-backed stand-in behaves the same.
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
window.open = () => null;

// React logs every caught error loudly; keep the test output readable.
const realConsoleError = console.error;
const consoleErrors = [];
console.error = (...args) => {
  consoleErrors.push(args.map(String).join(' '));
};

// ---- bundle the fixture ----------------------------------------------------
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinny-eb-'));
const outFile = path.join(outDir, 'fixture.mjs');
await build({
  entryPoints: [path.join(ROOT, 'scripts/fixtures/error-boundaries.fixture.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: outFile,
  loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty' },
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  jsx: 'transform',
  logLevel: 'error',
});
const fx = await import(pathToFileURL(outFile).href);

const tick = (ms = 80) =>
  fx.act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });

const TABBABLE_ERR = /at least one tabbable node/;

test('CONTROL: the raw focus-trap still throws on an empty popup (bug reproduced)', async () => {
  const m = fx.mountRawEmptyTrap({ initialFocus: false });
  await tick();
  assert.ok(m.errors.length > 0, 'raw FocusTrap should throw in this environment');
  assert.match(String(m.errors[0]?.message ?? m.errors[0]), TABBABLE_ERR);
  m.unmount();
});

for (const [site, makeOptions] of Object.entries(fx.SITE_OPTIONS)) {
  test(`SafeFocusTrap: empty "${site}" popup mounts without throwing`, async () => {
    const before = consoleErrors.length;
    const m = fx.mountSafeEmptyTrap(site, makeOptions());
    await tick();
    assert.deepEqual(
      m.errors.map((e) => e?.message ?? String(e)),
      [],
      'no error may escape the popup'
    );
    assert.equal(m.container.querySelector('[data-safe-boundary]'), null, 'no error box shown');
    assert.ok(m.container.querySelector(`[data-popup="${site}"]`), 'popup content rendered');
    const leaked = consoleErrors.slice(before).filter((l) => TABBABLE_ERR.test(l));
    assert.deepEqual(leaked, [], 'focus-trap must not report the tabbable-node error');
    m.unmount();
  });
}

test('a throwing component inside a popup shows the popup fallback, siblings survive', async () => {
  let closed = 0;
  const m = fx.mountThrowingPopup(() => {
    closed += 1;
  });
  await tick();
  assert.deepEqual(m.errors, [], 'the error must not reach the outer boundary');
  assert.equal(m.container.querySelector('[data-outer-crashed]'), null);
  const box = m.container.querySelector('[data-safe-boundary="popup"]');
  assert.ok(box, 'popup fallback rendered');
  assert.match(box.textContent, /Something went wrong here/);
  assert.match(box.textContent, /boom inside a popup/);
  const labels = [...box.querySelectorAll('button')].map((b) => b.textContent);
  assert.deepEqual(labels, ['Retry', 'Report', 'Close']);
  assert.ok(m.container.querySelector('[data-sibling="before"]'));
  assert.ok(m.container.querySelector('[data-sibling="after"]'));
  await fx.act(async () => {
    [...box.querySelectorAll('button')].find((b) => b.textContent === 'Close').click();
  });
  assert.equal(closed, 1, 'Close calls the popup onDeactivate');
  assert.ok(Array.isArray(window.cinnyErrors) && window.cinnyErrors.length > 0, 'error recorded');
  m.unmount();
});

test('a message that throws is replaced by a one-line box; neighbours still render; Retry recovers', async () => {
  fx.setFailMiddle(true);
  const m = fx.mountTimeline();
  await tick();
  assert.deepEqual(m.errors, [], 'the timeline itself must not crash');
  assert.ok(m.container.querySelector('[data-message-id="m1"]'), 'm1 rendered');
  assert.ok(m.container.querySelector('[data-message-id="m3"]'), 'm3 rendered');
  assert.equal(m.container.querySelector('[data-message-id="m2"]'), null);
  const box = m.container.querySelector('[data-safe-boundary="message m2"]');
  assert.ok(box, 'message fallback rendered');
  assert.match(box.textContent, /This message could not be shown/);

  fx.setFailMiddle(false);
  await fx.act(async () => {
    box.querySelector('[data-safe-boundary-retry]').click();
  });
  assert.ok(m.container.querySelector('[data-message-id="m2"]'), 'Retry re-renders the message');
  assert.equal(m.container.querySelector('[data-safe-boundary]'), null);
  m.unmount();
});

// ---- static audit ------------------------------------------------------------
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.(tsx?|jsx?)$/.test(d.name) ? [p] : [];
  });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('no file imports focus-trap-react directly (all go through SafeFocusTrap)', () => {
  const offenders = walk(path.join(ROOT, 'src'))
    .filter((f) => !f.includes(`${path.sep}components${path.sep}focus-trap${path.sep}`))
    .filter((f) => /from ['"]focus-trap-react['"]/.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f));
  assert.deepEqual(offenders, []);
});

test('timeline, room view, settings and router keep their boundaries', () => {
  assert.match(
    read('src/app/features/room/RoomTimeline.tsx'),
    /<SafeBoundary[^>]*variant="message"/
  );
  const room = read('src/app/features/room/Room.tsx');
  assert.match(room, /<SafeBoundary where="room view"[\s\S]*?<RoomView /);
  assert.match(
    read('src/app/features/settings/Settings.tsx'),
    /<SafeBoundary[\s\S]*?settings page/
  );
  assert.match(read('src/app/pages/Router.tsx'), /errorElement=\{<RouteErrorPage \/>\}/);
  assert.match(read('src/index.tsx'), /<RootErrorBoundary>/);
});

test.after(() => {
  console.error = realConsoleError;
  fs.rmSync(outDir, { recursive: true, force: true });
  window.close(); // stops jsdom's timers so the process can exit
});
