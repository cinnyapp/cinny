/**
 * Which picture to show next to a message (and everywhere else a *person* is
 * shown inside a room: replies, reactions, read receipts, member list,
 * search results, notifications, pinned messages, mentions, calls).
 *
 * Normal rooms: the person's own picture from their current member event.
 *
 * Bridged 1:1 chats (WhatsApp/Signal/Telegram … via mautrix): the other
 * person is a bridge "ghost" user. The bridge sets the *chat's* picture
 * reliably but the ghost's own profile picture is sometimes missing (WhatsApp
 * privacy settings, the new WhatsApp "LID" ids, a second ghost for the same
 * person) or still loading. In that case we show the chat's picture for that
 * person, so the message looks like it comes from them — the same picture
 * the chat list and the room header show (utils/dmAvatar.ts).
 *
 * Order (setting "Prefer Contact Photo in 1:1 Chats" on, the default):
 *   1. the person's own current picture
 *   2. bridged 1:1 chat only: the chat's picture
 *   3. nothing → the coloured initial placeholder
 * Setting off: the chat's picture first, the person's own second.
 *
 * `fallbackMxc` is the next candidate, tried when the first one fails to load
 * (deleted / 404 / blocked media).
 *
 * Pure logic, structurally typed, so it runs in a plain node unit test.
 */
import type { RoomMember } from 'matrix-js-sdk';
import type { DmRoomLike } from './dmAvatar';
import { getBridgeInfo, getPreferContactPhoto, isBridgedDm } from './dmAvatar';

export type SenderRoomLike = DmRoomLike & {
  getMember: (userId: string) => Pick<RoomMember, 'getMxcAvatarUrl'> | null;
};

export type SenderAvatarMxcs = {
  mxc?: string;
  fallbackMxc?: string;
};

const FUNCTIONAL_MEMBERS = 'io.element.functional_members';

const functionalMembers = (room: SenderRoomLike): string[] => {
  try {
    const members = room.currentState
      .getStateEvents(FUNCTIONAL_MEMBERS, '')
      ?.getContent()?.service_members;
    return Array.isArray(members) ? members.filter((m): m is string => typeof m === 'string') : [];
  } catch {
    return [];
  }
};

/**
 * Is `userId` the other person of a bridged 1:1 chat? True for any member that
 * is not me, not the bridge bot / a functional member, and not the bridge's
 * puppet of my own account — so both ghosts of the same contact (old phone
 * number id and new WhatsApp LID id) count, and it works before the member
 * list is loaded.
 */
export const isBridgedDmContact = (room: SenderRoomLike, userId: string): boolean => {
  if (!userId || userId === room.myUserId) return false;
  if (!isBridgedDm(room)) return false;
  const bridge = getBridgeInfo(room);
  if (bridge?.bridgebot === userId) return false;
  if (functionalMembers(room).includes(userId)) return false;
  if (bridge?.receiver && userId.includes(`_${bridge.receiver}:`)) return false;
  return true;
};

const memberMxc = (room: SenderRoomLike, userId: string): string | undefined => {
  try {
    return room.getMember(userId)?.getMxcAvatarUrl() || undefined;
  } catch {
    return undefined;
  }
};

const roomMxcOf = (room: SenderRoomLike): string | undefined => {
  try {
    return room.getMxcAvatarUrl() || undefined;
  } catch {
    return undefined;
  }
};

export const getSenderAvatarMxcs = (
  room: SenderRoomLike,
  userId: string,
  preferContact: boolean = getPreferContactPhoto()
): SenderAvatarMxcs => {
  const own = memberMxc(room, userId);
  if (!isBridgedDmContact(room, userId)) return { mxc: own };

  const roomMxc = roomMxcOf(room);
  const [first, second] = preferContact ? [own, roomMxc] : [roomMxc, own];
  const mxc = first ?? second;
  const fallbackMxc = first && second && second !== first ? second : undefined;
  return { mxc, fallbackMxc };
};

/** Just the picture to try first (non-React callers: notifications, lists). */
export const getSenderAvatarMxc = (
  room: SenderRoomLike,
  userId: string,
  preferContact?: boolean
): string | undefined => getSenderAvatarMxcs(room, userId, preferContact).mxc;
