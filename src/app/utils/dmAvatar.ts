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
  const content = BRIDGE_STATE_TYPES.map((type) => {
    try {
      const events = state.getStateEvents(type);
      return Array.isArray(events) ? events[0]?.getContent() : undefined;
    } catch {
      return undefined;
    }
  }).find((c) => !!c);
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

const getFunctionalMembers = (room: DmRoomLike): string[] => {
  const members = stateContent(room, FUNCTIONAL_MEMBERS)?.service_members;
  return Array.isArray(members) ? members.filter((m): m is string => typeof m === 'string') : [];
};

/**
 * The other person in a 1:1 chat, or undefined when we can't tell (yet).
 * Ignores yourself, the bridge bot, other "functional" members and the
 * bridge's puppet of your own account.
 */
export const getDmPartnerMember = (room: DmRoomLike): RoomMember | undefined => {
  const bridge = getBridgeInfo(room);
  const skip = new Set<string>(getFunctionalMembers(room));
  if (room.myUserId) skip.add(room.myUserId);
  if (bridge?.bridgebot) skip.add(bridge.bridgebot);

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
      const remoteId = bridge.channelId?.split('@')[0];
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
