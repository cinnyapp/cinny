import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { StateEventWithoutRoomId } from 'neurone/lib/api/types';
import { ObjectReader } from 'neurone/lib/utils';
import { Storage } from '../storage';
import {
  JoinRoomStateObject,
  JoinRoomStickyObject,
  JoinRoomMemberObject,
  getJoinRoomMemberId,
} from '../storage/collections';
import { CALL_APPLICATION_TYPE, DEFAULT_CALL_SLOT_IDS, resolveActiveRtcMembers } from './rtcMember';
import { randomStr } from '../../app/utils/common';

export type CallMember = {
  kind: 'call.member' | 'rtc.member';
  /** Unique within the room. */
  id: string;
  userId: string;
  deviceId?: string;
  expiresAt: number;
  intent?: 'audio' | 'video';
  capabilities?: string[];
  event: StateEventWithoutRoomId | JoinRoomStickyObject['event'];
};

// js-sdk's DEFAULT_EXPIRE_DURATION, used when `expires` is missing.
const DEFAULT_CALL_MEMBER_EXPIRE_MS = 4 * 60 * 60 * 1000;

/**
 * Absolute expiry (unix ms) of a legacy `call.member` event, or undefined if the
 * event doesn't represent an active membership (empty content = left).
 */
export const getCallMemberExpiresAt = (event: StateEventWithoutRoomId): number | undefined => {
  const { content } = event;
  if (!content || Object.keys(content).length === 0) return undefined;

  // Absolute timestamp variants, if an implementation sends them.
  const absolute =
    ObjectReader.number(content, 'expires_ts') ?? ObjectReader.number(content, 'expires_at');
  if (absolute !== undefined) return absolute;

  // `expires` is a lifetime in ms, counted from the join time.
  const startTs =
    ObjectReader.number(content, 'created_ts') ?? ObjectReader.number(event, 'origin_server_ts');
  if (startTs === undefined) return undefined;

  return startTs + (ObjectReader.number(content, 'expires') ?? DEFAULT_CALL_MEMBER_EXPIRE_MS);
};

export const isActiveCallMember = (event: StateEventWithoutRoomId, now: number): boolean => {
  const expiresAt = getCallMemberExpiresAt(event);
  return expiresAt !== undefined && expiresAt > now;
};

type EventLike = { event: { event_id: string } };

const isSameEventIds = (prev: EventLike[], next: EventLike[]): boolean => {
  if (prev.length !== next.length) return false;
  const prevIds = new Set(prev.map((o) => o.event.event_id));
  const nextIds = new Set(next.map((o) => o.event.event_id));
  return prevIds.size === nextIds.size && [...nextIds].every((id) => prevIds.has(id));
};

type MemberEntries = ObservableValue<Array<JoinRoomMemberObject | undefined>>;

export class CallSession implements Disposable {
  public readonly roomId: string;

  /** Active call members (legacy + MatrixRTC) whose room membership is `join`. */
  public readonly members: ObservableValue<CallMember[]>;

  private readonly storage: Storage;

  private readonly publisherKey = randomStr();

  private callEvents: JoinRoomStateObject[] = [];

  private rtcEvents: JoinRoomStickyObject[] = [];

  private slotEvents: JoinRoomStateObject[] = [];

  private readonly redacted = new ObservableValue<Set<string>>(new Set(), this.publisherKey);

  /** Room-member entries for the current senders. */
  private memberEntries?: MemberEntries;

  private memberEntriesDisposer?: Disposer;

  private sendersKey = '';

  /** Bumped whenever the sender set changes so stale async work is discarded. */
  private generation = 0;

  private expiryTimer?: ReturnType<typeof setTimeout>;

  private disposed = false;

  private disposer = new Disposer();

  constructor(roomId: string, storage: Storage) {
    this.roomId = roomId;
    this.storage = storage;
    this.members = new ObservableValue<CallMember[]>([], this.publisherKey);

    this.disposer.collect(
      this.redacted.subscribe(() => {
        this.refresh();
      })
    );
  }

  public async handleRedactions(eventIds: string[]) {
    if (eventIds.length === 0) return;
    const redacted = new Set([...this.redacted.read, ...eventIds]);
    this.redacted.publish(this.publisherKey, redacted);
  }

  public async handleCallMemberChange(events: JoinRoomStateObject[]) {
    if (isSameEventIds(this.callEvents, events)) return;
    this.callEvents = events;
    await this.refresh();
  }

  public async handleRtcMemberChange(events: JoinRoomStickyObject[]) {
    if (isSameEventIds(this.rtcEvents, events)) return;
    this.rtcEvents = events;
    await this.refresh();
  }

  public async handleRtcSlotChange(events: JoinRoomStateObject[]) {
    if (isSameEventIds(this.slotEvents, events)) return;
    this.slotEvents = events;
    await this.refresh();
  }

  private async refresh() {
    if (this.disposed) return;
    await this.syncMemberEntries();
    this.recompute();
  }

  /** Slot ids of open default call slots (`m.call#room`). */
  private getOpenSlotIds(): Set<string> {
    const open = new Set<string>();
    this.slotEvents.forEach(({ event }) => {
      const application = ObjectReader.object(event.content, 'application');
      if (
        DEFAULT_CALL_SLOT_IDS.has(event.state_key) &&
        ObjectReader.string(event.content, 'status') === 'open' &&
        ObjectReader.string(application, 'type') === CALL_APPLICATION_TYPE
      ) {
        open.add(event.state_key);
      }
    });
    return open;
  }

  private getActiveRtcMembers(now: number) {
    const openSlots = this.getOpenSlotIds();
    if (openSlots.size === 0) return [];
    return resolveActiveRtcMembers(
      this.rtcEvents.map((obj) => obj.event),
      now
    ).filter((m) => openSlots.has(m.slotId));
  }

  private collectSenders(): string[] {
    const now = Date.now();
    const senders = new Set<string>();
    this.callEvents.forEach(({ event }) => {
      if (isActiveCallMember(event, now)) senders.add(event.sender);
    });
    this.getActiveRtcMembers(now).forEach((m) => senders.add(m.userId));
    return [...senders].sort();
  }

  private async syncMemberEntries() {
    const senders = this.collectSenders();
    const key = senders.join('\n');
    if (key === this.sendersKey) return;

    this.sendersKey = key;
    this.generation += 1;
    const { generation } = this;

    if (senders.length === 0) {
      const old = this.memberEntriesDisposer;
      this.memberEntries = undefined;
      this.memberEntriesDisposer = undefined;
      old?.run();
      return;
    }

    const entries = await this.storage.joinRoomMember.observableRead.getMultiple(
      senders.map((userId) => getJoinRoomMemberId(this.roomId, userId))
    );

    // A newer sender set arrived (or we were disposed) while awaiting.
    if (this.disposed || generation !== this.generation) {
      entries.dispose();
      return;
    }

    // Keep the old entries until the new ones are ready, so `members` doesn't flicker.
    const old = this.memberEntriesDisposer;
    const disposer = new Disposer();
    disposer.collect(
      entries.subscribe(() => this.recompute()),
      entries // disposed exactly once, via the disposer
    );
    this.memberEntries = entries;
    this.memberEntriesDisposer = disposer;
    old?.run();
  }

  private recompute() {
    if (this.disposed) return;

    const now = Date.now();

    const joined = new Set<string>();
    this.memberEntries?.read.forEach((entry) => {
      if (entry && ObjectReader.string(entry.event.content, 'membership') === 'join') {
        joined.add(entry.userId);
      }
    });

    const next: CallMember[] = [];
    let nextExpiry = Infinity;

    this.callEvents.forEach(({ event }) => {
      const expiresAt = getCallMemberExpiresAt(event);
      if (expiresAt === undefined || expiresAt <= now) return;

      nextExpiry = Math.min(nextExpiry, expiresAt);
      if (!joined.has(event.sender)) return;

      next.push({
        kind: 'call.member',
        id: `call.member:${event.state_key}`,
        userId: event.sender,
        expiresAt,
        event,
      });
    });

    this.getActiveRtcMembers(now).forEach((m) => {
      if (this.redacted.read.has(m.event.event_id)) {
        return;
      }
      nextExpiry = Math.min(nextExpiry, m.expiresAt);
      if (!joined.has(m.userId)) return;

      next.push({
        kind: 'rtc.member',
        id: `rtc.member:${m.userId}:${m.memberId}`,
        userId: m.userId,
        deviceId: m.deviceId,
        expiresAt: m.expiresAt,
        intent: m.intent,
        capabilities: m.capabilities,
        event: m.event,
      });
    });

    this.members.publish(this.publisherKey, next);

    // Expiry produces no storage event, so wake up at the next one.
    clearTimeout(this.expiryTimer);
    if (Number.isFinite(nextExpiry)) {
      this.expiryTimer = setTimeout(() => this.recompute(), nextExpiry - now + 50);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.expiryTimer);
    this.memberEntriesDisposer?.run();
    this.members.dispose();
  }
}
