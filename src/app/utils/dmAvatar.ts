/**
 * Which picture to show for a 1:1 chat.
 *
 * Bridged 1:1 chats (WhatsApp, Signal, Telegram … via mautrix) are not plain
 * two-person rooms: they also contain the bridge bot and sometimes the
 * bridge's "puppet" of your own account. matrix-js-sdk's
 * `getAvatarFallbackMember()` gives up as soon as it counts more than two
 * people, and returns nothing while the other person's member event has not
 * been lazy-loaded yet. Cinny then fell back to the room's own picture (which
 * the bridge copied once and may never update), or showed no picture at all
 * in the room header.
 *
 * This module finds the actual other person and prefers their live profile
 * picture (setting "Prefer contact photo for 1:1 chats", on by default),
 * falling back to the room picture only when the person is not known yet.
 *
 * Pure logic, structurally typed, so it runs in a plain node unit test.
 */
import type { Room, RoomMember } from 'matrix-js-sdk';

type StateLike = {
  getContent: () => Record<string, unknown>;
};

/** The few Room methods this module uses — lets tests pass a small fake. */
export type DmRoomLike = Pick<
  Room,
  'roomId' | 'myUserId' | 'getMembers' | 'getMxcAvatarUrl' | 'getAvatarFallbackMember'
> & {
  currentState: {
    getStateEvents: (type: string, stateKey: string) => StateLike | null | undefined;
  };
};

const BRIDGE_STATE_TYPES = ['m.bridge', 'uk.half-shot.bridge'];
const FUNCTIONAL_MEMBERS = 'io.element.functional_members';

let preferContactPhoto = true;
/** Kept in sync with the `preferContactPhoto` setting (see ClientNonUIFeatures). */
export const setPreferContactPhoto = (value: boolean): void => {
  preferContactPhoto = value;
};
export const getPreferContactPhoto = (): boolean => preferContactPhoto;

const stateContent = (room: DmRoomLike, type: string): Record<string, unknown> | undefined => {
  try {
    return room.currentState.getStateEvents(type, '')?.getContent() ?? undefined;
  } catch {
    return undefined;
  }
};

export type BridgeInfo = {
  bridgebot?: string;
  /** `com.beeper.room_type` — "dm" for a bridged 1:1 chat. */
  roomType?: string;
  /** Remote id of the account the portal belongs to (mautrix `fi.mau.receiver`). */
  receiver?: string;
  channelName?: string;
  /** Remote id of the chat, e.g. "447896145370@s.whatsapp.net" or "1234@lid". */
  channelId?: string;
};

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/**
 * Bridges put an `m.bridge` state event with a non-empty state key; read the
 * first one we find. We only look at the live state (no network).
 */
export const getBridgeInfo = (room: DmRoomLike): BridgeInfo | undefined => {
  const state = room.currentState as unknown as {
    getStateEvents: (type: string) => StateLike[] | null | undefined;
  };
  // A portal can carry several bridge events (mautrix-telegram keeps its old
  // "net.maunium.telegram://…" one next to the new one): prefer the one that
  // says what kind of chat it is.
  const contents = BRIDGE_STATE_TYPES.flatMap((type) => {
    try {
      const events = state.getStateEvents(type);
      return Array.isArray(events) ? events.map((e) => e?.getContent()).filter((c) => !!c) : [];
    } catch {
      return [];
    }
  });
  const content =
    contents.find((c) => typeof c['com.beeper.room_type'] === 'string') ?? contents[0];
  if (content) {
    const channel = (content.channel ?? {}) as Record<string, unknown>;
    return {
      bridgebot: asString(content.bridgebot),
      roomType: asString(content['com.beeper.room_type']),
      receiver: asString(channel['fi.mau.receiver']),
      channelName: asString(channel.displayname),
      channelId: asString(channel.id),
    };
  }
  return undefined;
};

export const isBridgedDm = (room: DmRoomLike): boolean => getBridgeInfo(room)?.roomType === 'dm';

type JoinableRoomLike = DmRoomLike & { getMyMembership: () => string };

/**
 * Rooms the bridge itself marks as a 1:1 chat (m.bridge "com.beeper.room_type":
 * "dm"). Cinny only trusted the m.direct account data, which the Telegram
 * bridge did not fill for ~170 of his chats, so they showed up as rooms.
 * Groups and channels carry "group"/no type and are never included.
 */
export const getBridgedDmRoomIds = (rooms: JoinableRoomLike[]): Set<string> => {
  const ids = new Set<string>();
  rooms.forEach((room) => {
    try {
      const membership = room.getMyMembership();
      if ((membership === 'join' || membership === 'invite') && isBridgedDm(room)) {
        ids.add(room.roomId);
      }
    } catch {
      // a half-loaded room is simply not counted
    }
  });
  return ids;
};

const getFunctionalMembers = (room: DmRoomLike): string[] => {
  const members = stateContent(room, FUNCTIONAL_MEMBERS)?.service_members;
  return Array.isArray(members) ? members.filter((m): m is string => typeof m === 'string') : [];
};

/**
 * The other person in a 1:1 chat, or undefined when we can't tell (yet).
 * Ignores yourself, the bridge bot, other "functional" members and the
 * bridge's puppet of your own account.
 */
/** Members that are never "the other person": me, the bridge bot, functional members. */
const getNonPartnerIds = (room: DmRoomLike, bridge = getBridgeInfo(room)): Set<string> => {
  const skip = new Set<string>(getFunctionalMembers(room));
  if (room.myUserId) skip.add(room.myUserId);
  if (bridge?.bridgebot) skip.add(bridge.bridgebot);
  return skip;
};

export const getDmPartnerMember = (room: DmRoomLike): RoomMember | undefined => {
  const bridge = getBridgeInfo(room);
  const skip = getNonPartnerIds(room, bridge);

  let candidates = (room.getMembers() ?? []).filter(
    (m) => (m.membership === 'join' || m.membership === 'invite') && !skip.has(m.userId)
  );

  if (candidates.length > 1 && bridge) {
    // The bridge's puppet of *your own* remote account sits in some portals.
    const { receiver, channelName } = bridge;
    if (receiver) {
      const notOwnPuppet = candidates.filter((m) => !m.userId.includes(`_${receiver}:`));
      if (notOwnPuppet.length > 0) candidates = notOwnPuppet;
    }
    if (candidates.length > 1 && channelName) {
      const named = candidates.filter(
        (m) => m.name === channelName || m.rawDisplayName === channelName
      );
      if (named.length === 1) candidates = named;
    }
    if (candidates.length > 1 && bridge.roomType === 'dm') {
      // Still several: in a bridged 1:1 chat these are ghosts of the SAME person
      // (WhatsApp moved contacts to new "LID" ids, so a chat can hold the old
      // phone-number ghost and the new one). Pick the one the chat belongs to,
      // else the one that has a picture, else the first — never give up.
      // "447…@s.whatsapp.net" (WhatsApp) / "user:658736473" (Telegram) → the bare id
      const remoteId = bridge.channelId?.split('@')[0].replace(/^user:/, '');
      const byId = remoteId
        ? candidates.filter(
            (m) => m.userId.includes(`_${remoteId}:`) || m.userId.includes(`_lid-${remoteId}:`)
          )
        : [];
      if (byId.length === 1) return byId[0];
      return candidates.find((m) => !!m.getMxcAvatarUrl()) ?? candidates[0];
    }
  }

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) return undefined; // a group, not a 1:1 chat

  // Nobody loaded yet (lazy-loaded members) — let the SDK try the room heroes.
  const fallback = room.getAvatarFallbackMember();
  if (fallback && !skip.has(fallback.userId)) return fallback;
  return undefined;
};

/**
 * User id of the other person in a 1:1 chat (whose picture history the chat
 * header opens). `guess` (e.g. Cinny's guessDmRoomUserId, "oldest joined
 * member") is only used when the partner can't be found, and never when it is
 * me / the bridge bot / a functional member — in a bridged DM the bot usually
 * joined first, so the plain guess picked the bot (2026-11-03).
 */
export const getDmPartnerUserId = (room: DmRoomLike, guess?: string): string | undefined => {
  const partner = getDmPartnerMember(room);
  if (partner) return partner.userId;
  return guess && !getNonPartnerIds(room).has(guess) ? guess : undefined;
};

/**
 * mxc:// of the picture to show for a 1:1 chat.
 *
 * preferContact (default): the person's own current picture, else the room
 * picture (it stands in for the person), else the initials placeholder.
 * !preferContact: the room picture first, the person's picture as fallback.
 */
export const getDmAvatarMxc = (
  room: DmRoomLike,
  preferContact: boolean = preferContactPhoto
): string | undefined => {
  const roomMxc = room.getMxcAvatarUrl() ?? undefined;
  const partner = getDmPartnerMember(room);
  const partnerMxc = partner?.getMxcAvatarUrl() || undefined;

  if (!preferContact) return roomMxc ?? partnerMxc;
  // The person's own picture first; when they have none (WhatsApp privacy, a new
  // ghost id, not loaded yet) the chat's picture stands in for them — the same
  // rule the sender picture next to messages uses (utils/senderAvatar.ts).
  return partnerMxc ?? roomMxc;
};

/** User id to colour the placeholder with, so list, header and timeline match. */
export const getDmColorKey = (room: DmRoomLike): string =>
  getDmPartnerMember(room)?.userId ?? room.roomId;
