import { ObjectReader } from 'neurone/lib/utils';
import { JoinRoomStickyObject } from '../storage/collections';

type StickyEvent = JoinRoomStickyObject['event'];

// Unstable identifiers for now; add the stable ones here once MSC4143 lands.
export const RTC_SLOT_EVENT_TYPE = 'org.matrix.msc4143.rtc.slot';
export const RTC_MEMBER_EVENT_TYPE = 'org.matrix.msc4143.rtc.member';

export const CALL_APPLICATION_TYPE = 'm.call';
// MSC4196 says `room`, the reference implementation uses `ROOM`. Accept both.
export const DEFAULT_CALL_SLOT_IDS: ReadonlySet<string> = new Set(['m.call#room', 'm.call#ROOM']);

const STICKY_MAX_DURATION_MS = 60 * 60 * 1000;

export type RtcMember = {
  stickyKey: string;
  memberId: string;
  userId: string;
  deviceId?: string;
  slotId: string;
  expiresAt: number;
  intent?: 'audio' | 'video';
  capabilities?: string[];
  event: StickyEvent;
};

type ResolvedEntry = {
  stickyKey: string;
  memberId?: string;
  membership?: string;
  slotId?: string;
  applicationType?: string;
  deviceId?: string;
  intent?: 'audio' | 'video';
  capabilities?: string[];
  expiresAt: number;
  eventId: string;
  sender: string;
  event: StickyEvent;
};

export const getStickyExpiresAt = (event: StickyEvent): number | undefined => {
  const sticky =
    ObjectReader.object(event, 'msc4354_sticky') ?? ObjectReader.object(event, 'sticky');
  const duration = sticky ? ObjectReader.number(sticky, 'duration_ms') : undefined;
  const originTs = ObjectReader.number(event, 'origin_server_ts');
  if (duration === undefined || originTs === undefined) return undefined;
  return originTs + Math.min(duration, STICKY_MAX_DURATION_MS);
};

const parseIntent = (application: object | undefined): 'audio' | 'video' | undefined => {
  if (!application) return undefined;
  // Spec: `intent: m.audio|m.video`. Reference impl: `m.call.intent: audio|video`.
  const raw =
    ObjectReader.string(application, 'intent') ??
    ObjectReader.string(application, 'm.call.intent') ??
    ObjectReader.string(ObjectReader.object(application, 'm.call'), 'intent');
  if (raw === 'm.audio' || raw === 'audio') return 'audio';
  if (raw === 'm.video' || raw === 'video') return 'video';
  return undefined;
};

const parseEntry = (event: StickyEvent): ResolvedEntry | undefined => {
  const { content } = event;
  const expiresAt = getStickyExpiresAt(event);
  if (!content || expiresAt === undefined) return undefined;

  const member = ObjectReader.object(content, 'member');
  const application = ObjectReader.object(content, 'application');
  const memberId = ObjectReader.string(member, 'id');

  const stickyKey =
    ObjectReader.string(content, 'sticky_key') ??
    ObjectReader.string(content, 'msc4354_sticky_key') ??
    memberId;
  if (!stickyKey) return undefined; // not part of an ephemeral map

  return {
    stickyKey,
    memberId,
    membership: ObjectReader.string(member, 'membership'),
    slotId: ObjectReader.string(content, 'slot_id'),
    applicationType: ObjectReader.string(application, 'type'),
    deviceId: ObjectReader.string(member, 'device_id'),
    intent: parseIntent(application),
    capabilities: ObjectReader.array(application, 'capabilities')?.filter(
      (c): c is string => typeof c === 'string'
    ),
    expiresAt,
    eventId: event.event_id,
    sender: event.sender,
    event,
  };
};

// MSC4354 tie-break: highest expiry wins, then highest event ID.
const isNewer = (a: ResolvedEntry, b: ResolvedEntry): boolean =>
  a.expiresAt !== b.expiresAt ? a.expiresAt > b.expiresAt : a.eventId > b.eventId;

/**
 * Builds the MSC4354 ephemeral map for one room and returns the entries that are
 * currently joined to the default call slot and not expired.
 * Slot-open and room-membership checks are done by the caller.
 */
export const resolveActiveRtcMembers = (events: StickyEvent[], now: number): RtcMember[] => {
  const winners = new Map<string, ResolvedEntry>();

  events.forEach((event) => {
    if (event.type !== RTC_MEMBER_EVENT_TYPE) return;
    const entry = parseEntry(event);
    if (!entry) return;

    const mapKey = `${entry.sender}\n${entry.stickyKey}`;
    const current = winners.get(mapKey);
    if (!current || isNewer(entry, current)) winners.set(mapKey, entry);
  });

  const active: RtcMember[] = [];
  winners.forEach((entry) => {
    if (
      entry.membership !== 'join' ||
      entry.expiresAt <= now ||
      !entry.memberId ||
      !entry.slotId ||
      !DEFAULT_CALL_SLOT_IDS.has(entry.slotId) ||
      entry.applicationType !== CALL_APPLICATION_TYPE
    ) {
      return;
    }
    active.push({
      stickyKey: entry.stickyKey,
      memberId: entry.memberId,
      userId: entry.sender,
      deviceId: entry.deviceId,
      slotId: entry.slotId,
      expiresAt: entry.expiresAt,
      intent: entry.intent,
      capabilities: entry.capabilities,
      event: entry.event,
    });
  });
  return active;
};
