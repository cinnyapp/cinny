#!/usr/bin/env node
/**
 * The push-rule index must give exactly the same answer as matrix-js-sdk's own
 * matcher, only faster. Compares both on random rule sets + events.
 *
 *   npm run test:push-rules
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PushProcessor } from 'matrix-js-sdk/lib/pushprocessor.js';
import { MatrixEvent } from 'matrix-js-sdk/lib/models/event.js';

const { createIndexedMatcher, installPushRuleIndex, roomOnlyRuleTarget } = await import(
  '../src/client/pushRuleIndex.ts'
);

const ME = '@me:chagai.website';
let seed = 7;
const rnd = (n) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % n;
};
const pick = (a) => a[rnd(a.length)];
const ROOMS = Array.from({ length: 40 }, (_, i) => `!Room${i}abc:chagai.website`);
const USERS = Array.from({ length: 12 }, (_, i) => `@u${i}:chagai.website`);

const makeRules = () => {
  const override = [
    { rule_id: '.m.rule.master', default: true, enabled: false, conditions: [], actions: [] },
    {
      rule_id: '.m.rule.suppress_notices',
      default: true,
      enabled: true,
      conditions: [{ kind: 'event_match', key: 'content.msgtype', pattern: 'm.notice' }],
      actions: ['dont_notify'],
    },
  ];
  for (let i = 0; i < 30; i += 1) {
    const r = pick(ROOMS);
    const variant = rnd(6);
    let pattern = r;
    if (variant === 1) pattern = r.toUpperCase(); // case-insensitive match
    if (variant === 2) pattern = `${r.slice(0, 6)}*`; // glob: must stay in every view
    if (variant === 3) pattern = r.replace('o', '?');
    const cond = { kind: 'event_match', key: 'room_id', pattern };
    const conditions =
      variant === 4
        ? [cond, { kind: 'event_match', key: 'type', pattern: 'm.room.message' }]
        : [cond];
    if (variant === 5) conditions[0] = { kind: 'event_match', key: 'room_id', value: r };
    override.push({ rule_id: r, enabled: rnd(5) !== 0, conditions, actions: ['dont_notify'] });
  }
  override.push({
    rule_id: '.m.rule.tombstone',
    default: true,
    enabled: true,
    conditions: [
      { kind: 'event_match', key: 'type', pattern: 'm.room.tombstone' },
      { kind: 'event_match', key: 'state_key', pattern: '' },
    ],
    actions: ['notify', { set_tweak: 'highlight' }],
  });
  const content = [
    {
      rule_id: 'kw',
      enabled: true,
      pattern: 'pizza',
      actions: ['notify', { set_tweak: 'highlight' }],
    },
  ];
  const room = ROOMS.filter(() => rnd(3) === 0).map((r) => ({
    rule_id: r,
    enabled: rnd(4) !== 0,
    actions: rnd(2) ? ['notify'] : [],
  }));
  const sender = USERS.filter(() => rnd(3) === 0).map((u) => ({
    rule_id: u,
    enabled: true,
    actions: ['notify'],
  }));
  const underride = [
    {
      rule_id: '.m.rule.message',
      default: true,
      enabled: true,
      conditions: [{ kind: 'event_match', key: 'type', pattern: 'm.room.message' }],
      actions: ['notify'],
    },
    {
      rule_id: '.m.rule.encrypted',
      default: true,
      enabled: true,
      conditions: [{ kind: 'event_match', key: 'type', pattern: 'm.room.encrypted' }],
      actions: ['notify'],
    },
  ];
  return { global: { override, content, room, sender, underride } };
};

const makeEvent = () => {
  const type = pick([
    'm.room.message',
    'm.room.encrypted',
    'm.room.member',
    'm.room.tombstone',
    'm.reaction',
  ]);
  const ev = {
    type,
    room_id: pick(ROOMS),
    sender: pick([...USERS, ME]),
    event_id: `$e${rnd(1e9)}`,
    origin_server_ts: 1,
    content: {
      body: pick(['hi', 'pizza time', 'PIZZA', 'nothing']),
      msgtype: pick(['m.text', 'm.notice']),
    },
  };
  if (type === 'm.room.member' || type === 'm.room.tombstone') ev.state_key = '';
  if (rnd(10) === 0) ev.user_id = pick(USERS); // legacy field sender rules look at
  if (rnd(30) === 0) ev.room_id = ev.room_id.toUpperCase();
  return new MatrixEvent(ev);
};

const fakeClient = (pushRules) => ({
  pushRules,
  getSafeUserId: () => ME,
  getUserId: () => ME,
  supportsIntentionalMentions: () => true,
  getRoom: () => null,
});

test('room-only rule detection', () => {
  assert.equal(
    roomOnlyRuleTarget({
      rule_id: 'x',
      conditions: [{ kind: 'event_match', key: 'room_id', pattern: '!AbC:hs' }],
    }),
    '!abc:hs'
  );
  assert.equal(
    roomOnlyRuleTarget({
      rule_id: 'x',
      conditions: [{ kind: 'event_match', key: 'room_id', pattern: '!a*' }],
    }),
    undefined
  );
  assert.equal(
    roomOnlyRuleTarget({
      rule_id: 'x',
      conditions: [{ kind: 'event_match', key: 'room_id', value: '!a:hs' }],
    }),
    undefined
  );
  assert.equal(roomOnlyRuleTarget({ rule_id: 'x', conditions: [] }), undefined);
});

test('identical results to the SDK on 40 random rule sets x 500 events', () => {
  let compared = 0;
  let matched = 0;
  for (let s = 0; s < 40; s += 1) {
    const rules = makeRules();
    const plain = new PushProcessor(fakeClient(rules));
    const fast = new PushProcessor(fakeClient(rules));
    assert.equal(installPushRuleIndex({ pushProcessor: fast }), true);
    assert.equal(installPushRuleIndex({ pushProcessor: fast }), false, 'second install is a no-op');
    for (let i = 0; i < 500; i += 1) {
      const ev = makeEvent();
      const a = plain.actionsAndRuleForEvent(ev);
      const b = fast.actionsAndRuleForEvent(ev);
      assert.deepEqual(b, a, `rule set ${s} event ${i} ${ev.getRoomId()} ${ev.getType()}`);
      compared += 1;
      if (a.rule) matched += 1;
    }
  }
  assert.ok(matched > compared / 4, 'the comparison exercised real matches');
});

test('rules changed in place are picked up (enabled flag, appended rule)', () => {
  const rules = makeRules();
  const pp = new PushProcessor(fakeClient(rules));
  installPushRuleIndex({ pushProcessor: pp });
  const ev = new MatrixEvent({
    type: 'm.room.message',
    room_id: '!Fresh:chagai.website',
    sender: USERS[0],
    event_id: '$x',
    content: { body: 'yo', msgtype: 'm.text' },
  });
  assert.equal(pp.actionsAndRuleForEvent(ev).rule.rule_id, '.m.rule.message');
  rules.global.override.splice(2, 0, {
    rule_id: '!Fresh:chagai.website',
    enabled: true,
    conditions: [{ kind: 'event_match', key: 'room_id', pattern: '!Fresh:chagai.website' }],
    actions: ['dont_notify'],
  });
  assert.equal(pp.actionsAndRuleForEvent(ev).rule.rule_id, '!Fresh:chagai.website');
  rules.global.override[2].enabled = false;
  assert.equal(pp.actionsAndRuleForEvent(ev).rule.rule_id, '.m.rule.message');
});

test('is much faster with ~200 mute rules', () => {
  const rules = makeRules();
  for (let i = 0; i < 200; i += 1) {
    const r = `!mute${i}:chagai.website`;
    rules.global.override.splice(2, 0, {
      rule_id: r,
      enabled: true,
      conditions: [{ kind: 'event_match', key: 'room_id', pattern: r }],
      actions: ['dont_notify'],
    });
  }
  const events = Array.from({ length: 4000 }, makeEvent);
  const time = (pp) => {
    const t = performance.now();
    events.forEach((e) => pp.pushActionsForEventAndRulesets(e, rules));
    return performance.now() - t;
  };
  const plain = new PushProcessor(fakeClient(rules));
  const fast = new PushProcessor(fakeClient(rules));
  installPushRuleIndex({ pushProcessor: fast });
  time(plain);
  time(fast);
  const tp = time(plain);
  const tf = time(fast);
  console.log(`    4000 events: sdk ${tp.toFixed(1)} ms, indexed ${tf.toFixed(1)} ms`);
  assert.ok(tf * 3 < tp, `expected >3x faster (sdk ${tp}, indexed ${tf})`);
});

void createIndexedMatcher;
