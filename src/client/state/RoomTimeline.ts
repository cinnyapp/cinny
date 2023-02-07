import EventEmitter from 'events';
import {
  Direction,
  EventTimeline,
  MatrixClient,
  MatrixEvent,
  Room,
} from 'matrix-js-sdk';
import initMatrix from '../initMatrix';
import cons from './cons';

import settings from './settings';

function isEdited(mEvent: MatrixEvent) {
  return mEvent.getRelation()?.rel_type === 'm.replace';
}

function isReaction(mEvent: MatrixEvent) {
  return mEvent.getType() === 'm.reaction';
}

function hideMemberEvents(mEvent: MatrixEvent) {
  const content = mEvent.getContent();
  const prevContent = mEvent.getPrevContent();
  const { membership } = content;
  if (settings.hideMembershipEvents) {
    if (membership === 'invite' || membership === 'ban' || membership === 'leave') return true;
    if (prevContent.membership !== 'join') return true;
  }
  if (settings.hideNickAvatarEvents) {
    if (membership === 'join' && prevContent.membership === 'join') return true;
  }
  return false;
}

function getRelateToId(mEvent: MatrixEvent) {
  const relation = mEvent.getRelation();
  return relation?.event_id;
}

function addToMap(myMap: Map<string, MatrixEvent[]>, mEvent: MatrixEvent) {
  const relateToId = getRelateToId(mEvent);
  if (relateToId === null) return null;
  const mEventId = mEvent.getId();

  if (typeof myMap.get(relateToId) === 'undefined') myMap.set(relateToId, []);
  const mEvents = myMap.get(relateToId);
  if (mEvents.find((ev) => ev.getId() === mEventId)) return mEvent;
  mEvents.push(mEvent);
  return mEvent;
}

function getFirstLinkedTimeline(timeline: EventTimeline) {
  let tm = timeline;
  // @ts-ignore
  while (tm.prevTimeline) {
    // @ts-ignore
    tm = tm.prevTimeline;
  }
  return tm;
}
function getLastLinkedTimeline(timeline: EventTimeline) {
  let tm = timeline;
  // @ts-ignore
  while (tm.nextTimeline) {
    // @ts-ignore
    tm = tm.nextTimeline;
  }
  return tm;
}

function iterateLinkedTimelines(
  timeline: EventTimeline,
  backwards: boolean,
  callback: (tm: EventTimeline) => void
) {
  let tm = timeline;
  while (tm) {
    callback(tm);
    // @ts-ignore
    if (backwards) tm = tm.prevTimeline;
    // @ts-ignore
    else tm = tm.nextTimeline;
  }
}

function isTimelineLinked(tm1: EventTimeline, tm2: EventTimeline) {
  let tm = getFirstLinkedTimeline(tm1);
  while (tm) {
    if (tm === tm2) return true;
    // @ts-ignore
    tm = tm.nextTimeline;
  }
  return false;
}

class RoomTimeline extends EventEmitter {
  timeline: any[];

  editedTimeline: Map<any, any>;

  reactionTimeline: Map<any, any>;

  typingMembers: Set<unknown>;

  matrixClient: MatrixClient;

  roomId: string;

  room: any;

  liveTimeline;

  activeTimeline: any;

  isOngoingPagination: boolean;

  ongoingDecryptionCount: number;

  initialized: boolean;

  _listenRoomTimeline: (
    event: any,
    room: any,
    toStartOfTimeline: any,
    removed: any,
    data: any
  ) => void;

  _listenDecryptEvent: (event: any) => void;

  _listenRedaction: (mEvent: MatrixEvent, room: any) => void;

  _listenTypingEvent: (event: any, member: any) => void;

  _listenReciptEvent: (event: any, room: any) => void;

  constructor(roomId: string) {
    super();
    // These are local timelines
    this.timeline = [];
    this.editedTimeline = new Map();
    this.reactionTimeline = new Map();
    this.typingMembers = new Set();

    this.matrixClient = initMatrix.matrixClient;
    this.roomId = roomId;
    this.room = this.matrixClient.getRoom(roomId);

    this.liveTimeline = this.room.getLiveTimeline();
    this.activeTimeline = this.liveTimeline;

    this.isOngoingPagination = false;
    this.ongoingDecryptionCount = 0;
    this.initialized = false;

    setTimeout(() => this.room.loadMembersIfNeeded());

    // TODO: remove below line
    // @ts-ignore
    window.selectedRoom = this;
  }

  isServingLiveTimeline() {
    return getLastLinkedTimeline(this.activeTimeline) === this.liveTimeline;
  }

  canPaginateBackward() {
    if (this.timeline[0]?.getType() === 'm.room.create') return false;
    const tm = getFirstLinkedTimeline(this.activeTimeline);
    return tm.getPaginationToken(Direction.Backward) !== null;
  }

  canPaginateForward() {
    return !this.isServingLiveTimeline();
  }

  isEncrypted() {
    return this.matrixClient.isRoomEncrypted(this.roomId);
  }

  clearLocalTimelines() {
    this.timeline = [];
  }

  addToTimeline(mEvent: MatrixEvent) {
    if (mEvent.getType() === 'm.room.member' && hideMemberEvents(mEvent)) {
      return;
    }
    if (mEvent.isRedacted()) return;
    if (isReaction(mEvent)) {
      addToMap(this.reactionTimeline, mEvent);
      return;
    }
    if (!cons.supportEventTypes.includes(mEvent.getType())) return;
    if (isEdited(mEvent)) {
      addToMap(this.editedTimeline, mEvent);
      return;
    }
    this.timeline.push(mEvent);
  }

  _populateAllLinkedEvents(timeline: EventTimeline) {
    const firstTimeline = getFirstLinkedTimeline(timeline);
    iterateLinkedTimelines(firstTimeline, false, (tm) => {
      tm.getEvents().forEach((mEvent: MatrixEvent) => this.addToTimeline(mEvent));
    });
  }

  _populateTimelines() {
    this.clearLocalTimelines();
    this._populateAllLinkedEvents(this.activeTimeline);
  }

  async _reset() {
    if (this.isEncrypted()) await this.decryptAllEventsOfTimeline(this.activeTimeline);
    this._populateTimelines();
    if (!this.initialized) {
      this.initialized = true;
      this._listenEvents();
    }
  }

  async loadLiveTimeline() {
    this.activeTimeline = this.liveTimeline;
    await this._reset();
    this.emit(cons.events.roomTimeline.READY, null);
    return true;
  }

  async loadEventTimeline(eventId: string) {
    // we use first unfiltered EventTimelineSet for room pagination.
    const timelineSet = this.getUnfilteredTimelineSet();
    try {
      const eventTimeline = await this.matrixClient.getEventTimeline(timelineSet, eventId);
      this.activeTimeline = eventTimeline;
      await this._reset();
      this.emit(cons.events.roomTimeline.READY, eventId);
      return true;
    } catch {
      return false;
    }
  }

  async paginateTimeline(backwards = false, limit = 30) {
    if (this.initialized === false) return false;
    if (this.isOngoingPagination) return false;

    this.isOngoingPagination = true;

    const timelineToPaginate = backwards
      ? getFirstLinkedTimeline(this.activeTimeline)
      : getLastLinkedTimeline(this.activeTimeline);

    if (
      timelineToPaginate.getPaginationToken(backwards ? Direction.Backward : Direction.Forward) ===
      null
    ) {
      this.emit(cons.events.roomTimeline.PAGINATED, backwards, 0);
      this.isOngoingPagination = false;
      return false;
    }

    const oldSize = this.timeline.length;
    try {
      await this.matrixClient.paginateEventTimeline(timelineToPaginate, { backwards, limit });

      if (this.isEncrypted()) await this.decryptAllEventsOfTimeline(this.activeTimeline);
      this._populateTimelines();

      const loaded = this.timeline.length - oldSize;
      this.emit(cons.events.roomTimeline.PAGINATED, backwards, loaded);
      this.isOngoingPagination = false;
      return true;
    } catch {
      this.emit(cons.events.roomTimeline.PAGINATED, backwards, 0);
      this.isOngoingPagination = false;
      return false;
    }
  }

  decryptAllEventsOfTimeline(eventTimeline) {
    const decryptionPromises = eventTimeline
      .getEvents()
      .filter((event) => event.isEncrypted() && !event.clearEvent)
      .reverse()
      .map((event) => event.attemptDecryption(this.matrixClient.crypto, { isRetry: true }));

    return Promise.allSettled(decryptionPromises);
  }

  hasEventInTimeline(eventId, timeline = this.activeTimeline) {
    const timelineSet = this.getUnfilteredTimelineSet();
    const eventTimeline = timelineSet.getTimelineForEvent(eventId);
    if (!eventTimeline) return false;
    return isTimelineLinked(eventTimeline, timeline);
  }

  getUnfilteredTimelineSet() {
    return this.room.getUnfilteredTimelineSet();
  }

  getEventReaders(mEvent) {
    const liveEvents = this.liveTimeline.getEvents();
    const readers = [];
    if (!mEvent) return [];

    for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
      readers.splice(readers.length, 0, ...this.room.getUsersReadUpTo(liveEvents[i]));
      if (mEvent === liveEvents[i]) break;
    }

    return [...new Set(readers)];
  }

  getLiveReaders() {
    const liveEvents: MatrixEvent[] = this.liveTimeline.getEvents();
    const getLatestVisibleEvent = () => {
      for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
        const mEvent = liveEvents[i];
        if (mEvent.getType() === 'm.room.member' && hideMemberEvents(mEvent)) {
          // eslint-disable-next-line no-continue
          continue;
        }
        if (
          !mEvent.isRedacted() &&
          !isReaction(mEvent) &&
          !isEdited(mEvent) &&
          cons.supportEventTypes.includes(mEvent.getType())
        )
          return mEvent;
      }
      return liveEvents[liveEvents.length - 1];
    };

    return this.getEventReaders(getLatestVisibleEvent());
  }

  getUnreadEventIndex(readUpToEventId) {
    if (!this.hasEventInTimeline(readUpToEventId)) return -1;

    const readUpToEvent = this.findEventByIdInTimelineSet(readUpToEventId);
    if (!readUpToEvent) return -1;
    const rTs = readUpToEvent.getTs();

    const tLength = this.timeline.length;

    for (let i = 0; i < tLength; i += 1) {
      const mEvent = this.timeline[i];
      if (mEvent.getTs() > rTs) return i;
    }
    return -1;
  }

  getReadUpToEventId() {
    return this.room.getEventReadUpTo(this.matrixClient.getUserId());
  }

  getEventIndex(eventId) {
    return this.timeline.findIndex((mEvent) => mEvent.getId() === eventId);
  }

  findEventByIdInTimelineSet(eventId, eventTimelineSet = this.getUnfilteredTimelineSet()) {
    return eventTimelineSet.findEventById(eventId);
  }

  findEventById(eventId) {
    return this.timeline[this.getEventIndex(eventId)] ?? null;
  }

  deleteFromTimeline(eventId) {
    const i = this.getEventIndex(eventId);
    if (i === -1) return undefined;
    return this.timeline.splice(i, 1)[0];
  }

  _listenEvents() {
    this._listenRoomTimeline = (
      event: MatrixEvent,
      room: Room,
      toStartOfTimeline,
      removed,
      data
    ) => {
      if (room.roomId !== this.roomId) return;
      if (this.isOngoingPagination) return;

      // User is currently viewing the old events probably
      // no need to add new event and emit changes.
      // only add reactions and edited messages
      if (this.isServingLiveTimeline() === false) {
        if (!isReaction(event) && !isEdited(event)) return;
      }

      // We only process live events here
      if (!data.liveEvent) return;

      if (event.isEncrypted()) {
        // We will add this event after it is being decrypted.
        this.ongoingDecryptionCount += 1;
        return;
      }

      // FIXME: An unencrypted plain event can come
      // while previous event is still decrypting
      // and has not been added to timeline
      // causing unordered timeline view.

      this.addToTimeline(event);
      this.emit(cons.events.roomTimeline.EVENT, event);
    };

    this._listenDecryptEvent = (event: MatrixEvent) => {
      if (event.getRoomId() !== this.roomId) return;
      if (this.isOngoingPagination) return;

      // Not a live event.
      // so we don't need to process it here
      if (this.ongoingDecryptionCount === 0) return;

      if (this.ongoingDecryptionCount > 0) {
        this.ongoingDecryptionCount -= 1;
      }
      this.addToTimeline(event);
      this.emit(cons.events.roomTimeline.EVENT, event);
    };

    this._listenRedaction = (mEvent, room) => {
      if (room.roomId !== this.roomId) return;
      const rEvent = this.deleteFromTimeline(mEvent.event.redacts);
      this.editedTimeline.delete(mEvent.event.redacts);
      this.reactionTimeline.delete(mEvent.event.redacts);
      this.emit(cons.events.roomTimeline.EVENT_REDACTED, rEvent, mEvent);
    };

    this._listenTypingEvent = (event, member) => {
      if (member.roomId !== this.roomId) return;

      const isTyping = member.typing;
      if (isTyping) this.typingMembers.add(member.userId);
      else this.typingMembers.delete(member.userId);
      this.emit(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, new Set([...this.typingMembers]));
    };
    this._listenReciptEvent = (event, room) => {
      // we only process receipt for latest message here.
      if (room.roomId !== this.roomId) return;
      const receiptContent = event.getContent();

      const mEvents = this.liveTimeline.getEvents();
      const lastMEvent = mEvents[mEvents.length - 1];
      const lastEventId = lastMEvent.getId();
      const lastEventRecipt = receiptContent[lastEventId];

      if (typeof lastEventRecipt === 'undefined') return;
      if (lastEventRecipt['m.read']) {
        this.emit(cons.events.roomTimeline.LIVE_RECEIPT);
      }
    };
    // @ts-ignore
    this.matrixClient.on('Room.timeline', this._listenRoomTimeline);
    // @ts-ignore
    this.matrixClient.on('Room.redaction', this._listenRedaction);
    // @ts-ignore
    this.matrixClient.on('Event.decrypted', this._listenDecryptEvent);
    // @ts-ignore
    this.matrixClient.on('RoomMember.typing', this._listenTypingEvent);
    // @ts-ignore
    this.matrixClient.on('Room.receipt', this._listenReciptEvent);
  }

  removeInternalListeners() {
    if (!this.initialized) return;
    // @ts-ignore
    this.matrixClient.removeListener('Room.timeline', this._listenRoomTimeline);
    // @ts-ignore
    this.matrixClient.removeListener('Room.redaction', this._listenRedaction);
    // @ts-ignore
    this.matrixClient.removeListener('Event.decrypted', this._listenDecryptEvent);
    // @ts-ignore
    this.matrixClient.removeListener('RoomMember.typing', this._listenTypingEvent);
    // @ts-ignore
    this.matrixClient.removeListener('Room.receipt', this._listenReciptEvent);
  }
}

export default RoomTimeline;
