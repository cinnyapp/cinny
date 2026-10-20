/**
 * Chat list ordering and filtering — pure functions, unit tested by
 * `npm run test:chat-list`. The React side (`features/chat-list`) only gathers the
 * facts about each chat and calls these.
 */
import type { RoomActivity } from './roomActivity';

export type ChatNetwork =
  | 'whatsapp'
  | 'telegram'
  | 'signal'
  | 'messenger'
  | 'instagram'
  | 'linkedin'
  | 'matrix'
  | 'other';

export const CHAT_NETWORKS: readonly ChatNetwork[] = [
  'whatsapp',
  'telegram',
  'signal',
  'messenger',
  'instagram',
  'linkedin',
  'other',
  'matrix',
];

export const CHAT_NETWORK_LABEL: Record<ChatNetwork, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  signal: 'Signal',
  messenger: 'Messenger',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  matrix: 'Matrix',
  other: 'Other bridges',
};

/** `m.bridge` / `uk.half-shot.bridge` `protocol.id` values seen on mautrix bridges. */
const PROTOCOL_TO_NETWORK: Record<string, ChatNetwork> = {
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  signal: 'signal',
  facebook: 'messenger',
  facebookgo: 'messenger',
  messenger: 'messenger',
  instagram: 'instagram',
  instagramgo: 'instagram',
  linkedin: 'linkedin',
};

/** Puppet / bot user-id prefixes, used when a room carries no `m.bridge` state. */
const USER_PREFIX_TO_NETWORK: [RegExp, ChatNetwork][] = [
  [/^@whatsapp(bot|_)/i, 'whatsapp'],
  [/^@telegram(bot|_)/i, 'telegram'],
  [/^@signal(bot|_)/i, 'signal'],
  [/^@(messenger|facebook)(bot|_)/i, 'messenger'],
  [/^@instagram(bot|_)/i, 'instagram'],
  [/^@linkedin(bot|_)/i, 'linkedin'],
];

/**
 * Which network a chat is on. `protocolIds` come from the room's bridge state
 * events; `userIds` are fallbacks (the room creator, the DM partner) for portals
 * created before the bridge wrote `m.bridge`.
 */
export const detectChatNetwork = (
  protocolIds: readonly (string | undefined)[],
  userIds: readonly (string | undefined | null)[] = []
): ChatNetwork => {
  const known = protocolIds.find((id) => !!id && !!PROTOCOL_TO_NETWORK[id.toLowerCase()]);
  if (known) return PROTOCOL_TO_NETWORK[known.toLowerCase()];
  const sawUnknownBridge = protocolIds.some((id) => !!id);
  const byUser = userIds
    .map((userId) => (userId ? USER_PREFIX_TO_NETWORK.find(([re]) => re.test(userId)) : undefined))
    .find((hit) => !!hit);
  if (byUser) return byUser[1];
  return sawUnknownBridge ? 'other' : 'matrix';
};

/** Everything the list needs to know about one chat, gathered once per change. */
export type ChatFacts = {
  roomId: string;
  name: string;
  direct: boolean;
  muted: boolean;
  /** `m.lowpriority` — e.g. a chat archived on WhatsApp. */
  archived: boolean;
  favourite: boolean;
  network: ChatNetwork;
};

export type ChatSort = 'activity' | 'unread' | 'name';
/**
 * How muted (and archived) chats behave:
 *  - stay:   only move when YOU are involved (your message, a mention); dimmed.
 *  - bottom: always below every other chat.
 *  - hide:   not shown in "All" (still in the Muted filter and in name search).
 *  - normal: move like any other chat.
 */
export type MutedMode = 'stay' | 'bottom' | 'hide' | 'normal';

export type ChatFilter =
  | 'all'
  | 'unread'
  | 'people'
  | 'groups'
  | 'mentions'
  | 'favourites'
  | 'muted'
  | `net:${ChatNetwork}`;

export const isQuietChat = (facts: ChatFacts | undefined): boolean =>
  !!facts && (facts.muted || facts.archived);

const normalizeName = (name: string): string =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/#/g, '').toLowerCase().trim();

/** Case- and accent-insensitive "does this name contain the query". */
export const nameMatches = (name: string, query: string): boolean => {
  const q = normalizeName(query);
  if (!q) return true;
  return normalizeName(name).includes(q);
};

type SortRow = { id: string; group: number; key: number; tie: number; name: string };

/**
 * Order chats. O(n log n) with every key computed once up front, so it is cheap
 * enough to run when activity changes (which is only when a real message arrives —
 * never on navigation, never on profile/name/member noise).
 */
export const sortChats = (
  roomIds: readonly string[],
  facts: ReadonlyMap<string, ChatFacts>,
  activity: ReadonlyMap<string, RoomActivity>,
  sort: ChatSort,
  mutedMode: MutedMode
): string[] => {
  const rows: SortRow[] = roomIds.map((id) => {
    const f = facts.get(id);
    const quiet = mutedMode !== 'normal' && isQuietChat(f);
    if (sort === 'name') {
      return { id, group: 0, key: 0, tie: 0, name: normalizeName(f?.name ?? '') };
    }
    const a = activity.get(id);
    let key: number;
    if (!a) key = -1;
    else if (quiet && mutedMode === 'stay') {
      // Placed by the last time YOU were involved, but never above its own last message.
      if (a.mine <= 0) key = -1;
      else key = a.known ? Math.min(a.mine, a.ts) : a.mine;
    } else key = a.known ? a.ts : -1;
    return {
      id,
      group: quiet && (mutedMode === 'bottom' || mutedMode === 'hide') ? 1 : 0,
      key,
      tie: a?.upper ?? 0,
      name: '',
    };
  });

  if (sort === 'name') {
    rows.sort((x, y) => {
      if (x.name < y.name) return -1;
      if (x.name > y.name) return 1;
      return x.id < y.id ? -1 : 1;
    });
  } else {
    rows.sort((x, y) => {
      if (x.group !== y.group) return x.group - y.group;
      if (x.key !== y.key) return y.key - x.key;
      if (x.tie !== y.tie) return y.tie - x.tie;
      if (x.id === y.id) return 0;
      return x.id < y.id ? -1 : 1;
    });
  }
  return rows.map((r) => r.id);
};

/** Stable "unread first" on top of an already sorted list: O(n), no re-sort. */
export const unreadFirst = (
  sorted: readonly string[],
  isUnread: (roomId: string) => boolean
): string[] => {
  const head: string[] = [];
  const tail: string[] = [];
  sorted.forEach((id) => (isUnread(id) ? head : tail).push(id));
  return head.concat(tail);
};

export type ChatFilterContext = {
  facts: ReadonlyMap<string, ChatFacts>;
  isUnread: (roomId: string) => boolean;
  hasMention: (roomId: string) => boolean;
  mutedMode: MutedMode;
  query: string;
  /** Always kept visible (the chat that is open), so it never vanishes under you. */
  stickyRoomId?: string;
};

export const makeChatFilter = (
  filter: ChatFilter,
  ctx: ChatFilterContext
): ((roomId: string) => boolean) => {
  const { facts, isUnread, hasMention, mutedMode, query, stickyRoomId } = ctx;
  const q = normalizeName(query);
  const searching = q.length > 0;

  const chipMatches = (id: string, f: ChatFacts | undefined): boolean => {
    switch (filter) {
      case 'unread':
        return isUnread(id);
      case 'people':
        return !!f?.direct;
      case 'groups':
        return !!f && !f.direct;
      case 'mentions':
        return hasMention(id);
      case 'favourites':
        return !!f?.favourite;
      case 'muted':
        return isQuietChat(f);
      case 'all':
        // Hidden muted chats still turn up when you search for them by name.
        return !(mutedMode === 'hide' && !searching && isQuietChat(f));
      default:
        return filter.startsWith('net:') && f?.network === filter.slice(4);
    }
  };

  return (id) => {
    if (id === stickyRoomId) return true;
    const f = facts.get(id);
    if (!chipMatches(id, f)) return false;
    if (searching && !normalizeName(f?.name ?? '').includes(q)) return false;
    return true;
  };
};

export const CHAT_FILTERS: readonly ChatFilter[] = [
  'all',
  'unread',
  'people',
  'groups',
  'mentions',
  'favourites',
  'muted',
];

export const CHAT_FILTER_LABEL: Record<string, string> = {
  all: 'All',
  unread: 'Unread',
  people: 'People',
  groups: 'Groups',
  mentions: 'Mentions',
  favourites: 'Favourites',
  muted: 'Muted & archived',
};

export const chatFilterLabel = (filter: ChatFilter): string =>
  filter.startsWith('net:')
    ? CHAT_NETWORK_LABEL[filter.slice(4) as ChatNetwork] ?? filter
    : CHAT_FILTER_LABEL[filter] ?? filter;

export const isChatFilter = (value: unknown): value is ChatFilter =>
  typeof value === 'string' &&
  (CHAT_FILTERS.includes(value as ChatFilter) ||
    (value.startsWith('net:') && CHAT_NETWORKS.includes(value.slice(4) as ChatNetwork)));
