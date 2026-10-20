/**
 * Fast push-rule evaluation for accounts with many per-chat rules.
 *
 * Measured on a real 9,000-chat account (2026-10-20): while Cinny restores the
 * saved chats on a reload, **~60 % of the main-thread time is push-rule
 * matching**. matrix-js-sdk computes push actions for every restored state and
 * timeline event (≈150,000 events), and for each one it walks every rule in
 * order — here 194 "mute this chat" override rules
 * (`event_match room_id == !chat`), 151 room rules and 59 sender rules — building
 * a glob regex cache key and running a regex per rule. That is tens of millions
 * of rule checks for rules that can only ever match one chat.
 *
 * This wraps `PushProcessor.matchingRuleFromKindSet` so each event is only
 * checked against the rules that *could* match it: rules that say "this exact
 * chat" (or "this exact sender") are bucketed by chat/sender id, everything
 * else is kept as-is. The order of the remaining rules is untouched and the
 * SDK's own matcher still does the matching, so the result is identical —
 * `scripts/test-push-rule-index.mjs` checks that against the original on
 * random rule sets.
 */

type Condition = { kind?: string; key?: string; pattern?: string; value?: unknown };
type Rule = {
  rule_id: string;
  enabled?: boolean;
  conditions?: Condition[];
  pattern?: string;
  actions?: unknown[];
  default?: boolean;
};
export type KindSet = {
  override?: Rule[];
  content?: Rule[];
  room?: Rule[];
  sender?: Rule[];
  underride?: Rule[];
};
type EventLike = {
  getRoomId(): string | undefined;
  event: { user_id?: unknown; room_id?: unknown };
};
type Matcher = (ev: EventLike, kindset: KindSet) => unknown;

/**
 * A glob pattern with no wildcard is matched by the SDK as `^(pattern)$` with
 * the `i` flag. For plain ASCII room ids that is exactly a case-insensitive
 * string comparison; anything else is left to the SDK.
 */
const LITERAL_ASCII = /^[A-Za-z0-9!:._=\-/+#@$%&~]+$/;

/** The room id this override rule is limited to, or undefined if it is not that kind of rule. */
export const roomOnlyRuleTarget = (rule: Rule): string | undefined => {
  const conds = rule.conditions;
  if (!conds || conds.length !== 1) return undefined;
  const c = conds[0];
  if (c.kind !== 'event_match' || c.key !== 'room_id') return undefined;
  if (typeof c.value === 'string') return undefined; // value-match: leave to the SDK
  if (typeof c.pattern !== 'string' || !LITERAL_ASCII.test(c.pattern)) return undefined;
  return c.pattern.toLowerCase();
};

type Index = {
  signature: string;
  /** override rules that apply to every chat, in order, with room-only rules marked */
  override: Rule[];
  overrideTargets: (string | undefined)[];
  hasRoomOnlyOverride: boolean;
  roomByRule: Map<string, Rule[]>;
  senderByRule: Map<string, Rule[]>;
  views: Map<string, KindSet>;
};

const signatureOf = (k: KindSet): string =>
  [k.override, k.content, k.room, k.sender, k.underride].map((l) => l?.length ?? -1).join(',');

const bucket = (rules: Rule[] | undefined): Map<string, Rule[]> => {
  const map = new Map<string, Rule[]>();
  rules?.forEach((r) => {
    const list = map.get(r.rule_id);
    if (list) list.push(r);
    else map.set(r.rule_id, [r]);
  });
  return map;
};

const buildIndex = (k: KindSet): Index => {
  const override = k.override ?? [];
  const overrideTargets = override.map(roomOnlyRuleTarget);
  return {
    signature: signatureOf(k),
    override,
    overrideTargets,
    hasRoomOnlyOverride: overrideTargets.some((t) => t !== undefined),
    roomByRule: bucket(k.room),
    senderByRule: bucket(k.sender),
    views: new Map(),
  };
};

const EMPTY: Rule[] = [];
/** Per-chat views are cached; the cap only matters for absurdly many chats. */
const MAX_VIEWS = 50000;

export const createIndexedMatcher = (original: Matcher): Matcher => {
  const indexes = new WeakMap<KindSet, Index>();

  const indexFor = (k: KindSet): Index => {
    let idx = indexes.get(k);
    if (!idx || idx.signature !== signatureOf(k)) {
      idx = buildIndex(k);
      indexes.set(k, idx);
    }
    return idx;
  };

  return (ev, kindset) => {
    if (!kindset || typeof kindset !== 'object') return original(ev, kindset);
    const idx = indexFor(kindset);
    const roomId = ev.event?.room_id;
    if (typeof roomId !== 'string') return original(ev, kindset);

    let view = idx.views.get(roomId);
    if (!view) {
      const lower = roomId.toLowerCase();
      const override = idx.hasRoomOnlyOverride
        ? idx.override.filter((_, i) => {
            const t = idx.overrideTargets[i];
            return t === undefined || t === lower;
          })
        : idx.override;
      view = {
        override,
        content: kindset.content,
        // RoomSpecific rules match `room_id === rule_id` exactly (SDK templateRuleToRaw)
        room: idx.roomByRule.get(roomId) ?? EMPTY,
        sender: EMPTY,
        underride: kindset.underride,
      };
      if (idx.views.size >= MAX_VIEWS) idx.views.clear();
      idx.views.set(roomId, view);
    }
    // SenderSpecific rules match `event.user_id === rule_id` exactly (SDK templateRuleToRaw)
    const userId = ev.event?.user_id;
    const sender = typeof userId === 'string' ? idx.senderByRule.get(userId) ?? EMPTY : EMPTY;
    if (sender !== EMPTY) view = { ...view, sender };
    return original(ev, view);
  };
};

type PushProcessorLike = {
  matchingRuleFromKindSet?: Matcher;
  __cinnyIndexed?: boolean;
};

/** Install the fast path on a client's push processor. Safe to call twice. */
export const installPushRuleIndex = (mx: { pushProcessor?: unknown }): boolean => {
  const pp = mx.pushProcessor as PushProcessorLike | undefined;
  if (!pp || pp.__cinnyIndexed || typeof pp.matchingRuleFromKindSet !== 'function') return false;
  const original = pp.matchingRuleFromKindSet.bind(pp);
  pp.matchingRuleFromKindSet = createIndexedMatcher(original);
  pp.__cinnyIndexed = true;
  return true;
};
