import EventEmitter from 'events';
import initMatrix from '../initMatrix';
import cons from './cons';

import settings from './settings';

function isEdited(mEvent) {
  return mEvent.getRelation()?.rel_type === 'm.replace';
}

function isReaction(mEvent) {
  return mEvent.getType() === 'm.reaction';
}

function getRelateToId(mEvent) {
  const relation = mEvent.getRelation();
  return relation && relation.event_id;
}

function addToMap(myMap, mEvent) {
  const relateToId = getRelateToId(mEvent);
  if (relateToId === null) return null;
  const mEventId = mEvent.getId();

  if (typeof myMap.get(relateToId) === 'undefined') myMap.set(relateToId, []);
  const mEvents = myMap.get(relateToId);
  if (mEvents.find((ev) => ev.getId() === mEventId)) return mEvent;
  mEvents.push(mEvent);
  return mEvent;
}

function getFirstLinkedTimeline(timeline) {
  let tm = timeline;
  while (tm.prevTimeline) {
    tm = tm.prevTimeline;
  }
  return tm;
}
function getLastLinkedTimeline(timeline) {
  let tm = timeline;
  while (tm.nextTimeline) {
    tm = tm.nextTimeline;
  }
  return tm;
}

function iterateLinkedTimelines(timeline, backwards, callback) {
  let tm = timeline;
  while (tm) {
    callback(tm);
    if (backwards) tm = tm.prevTimeline;
    else tm = tm.nextTimeline;
  }
}

function isTimelineLinked(tm1, tm2) {
  let tm = getFirstLinkedTimeline(tm1);
  while (tm) {
    if (tm === tm2) return true;
    tm = tm.nextTimeline;
  }
  return false;
}

class RoomTimeline extends EventEmitter {
  constructor(roomId, notifications) {
    super();
    // These are local timelines
    this.timeline = [];
    this.editedTimeline = new Map();
    this.reactionTimeline = new Map();
    this.typingMembers = new Set();

    this.matrixClient = initMatrix.matrixClient;
    this.roomId = roomId;
    this.room = this.matrixClient.getRoom(roomId);
    this.notifications = notifications;

    this.liveTimeline = this.room.getLiveTimeline();
    this.activeTimeline = this.liveTimeline;

    this.isOngoingPagination = false;
    this.ongoingDecryptionCount = 0;
    this.initialized = false;

    setTimeout(() => this.room.loadMembersIfNeeded());

    // TODO: remove below line
    window.selectedRoom = this;
  }

  isServingLiveTimeline() {
    return getLastLinkedTimeline(this.activeTimeline) === this.liveTimeline;
  }

  canPaginateBackward() {
    if (this.timeline[0]?.getType() === 'm.room.create') return false;
    const tm = getFirstLinkedTimeline(this.activeTimeline);
    return tm.getPaginationToken('b') !== null;
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

  addToTimeline(mEvent) {
    if (mEvent.getType() === 'm.room.member' && (settings.hideMembershipEvents || settings.hideNickAvatarEvents)) {
      const content = mEvent.getContent();
      const prevContent = mEvent.getPrevContent();
      const { membership } = content;

      if (settings.hideMembershipEvents) {
        if (membership === 'invite' || membership === 'ban' || membership === 'leave') return;
        if (prevContent.membership !== 'join') return;
      }
      if (settings.hideNickAvatarEvents) {
        if (membership === 'join' && prevContent.membership === 'join') return;
      }
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

  _populateAllLinkedEvents(timeline) {
    const firstTimeline = getFirstLinkedTimeline(timeline);
    iterateLinkedTimelines(firstTimeline, false, (tm) => {
      tm.getEvents().forEach((mEvent) => this.addToTimeline(mEvent));
    });
  }

  _populateTimelines() {
    this.clearLocalTimelines();
    this._populateAllLinkedEvents(this.activeTimeline);
  }

  async _reset(eventId) {
    if (this.isEncrypted()) await this.decryptAllEventsOfTimeline(this.activeTimeline);
    this._populateTimelines();
    if (!this.initialized) {
      this.initialized = true;
      this._listenEvents();
    }
    this.emit(cons.events.roomTimeline.READY, eventId ?? null);
  }

  async loadLiveTimeline() {
    this.activeTimeline = this.liveTimeline;
    await this._reset();
    return true;
  }

  async loadEventTimeline(eventId) {
    // we use first unfiltered EventTimelineSet for room pagination.
    const timelineSet = this.getUnfilteredTimelineSet();
    try {
      const eventTimeline = await this.matrixClient.getEventTimeline(timelineSet, eventId);
      this.activeTimeline = eventTimeline;
      await this._reset(eventId);
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

    if (timelineToPaginate.getPaginationToken(backwards ? 'b' : 'f') === null) {
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

  markAllAsRead() {
    const readEventId = this.getReadUpToEventId();
    this.notifications.deleteNoti(this.roomId);
    if (this.timeline.length === 0) return;
    const latestEvent = this.timeline[this.timeline.length - 1];
    if (readEventId === latestEvent.getId()) return;
    this.matrixClient.sendReadReceipt(latestEvent);
    this.emit(cons.events.roomTimeline.MARKED_AS_READ, latestEvent);
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

  getLiveReaders() {
    const lastEvent = this.timeline[this.timeline.length - 1];
    const liveEvents = this.liveTimeline.getEvents();

    const readers = [];

    for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
      readers.splice(readers.length, 0, ...this.room.getUsersReadUpTo(liveEvents[i]));
      if (lastEvent === liveEvents[i]) break;
    }

    return [...new Set(readers)];
  }

  getEventReaders(mEvent) {
    const liveEvents = this.liveTimeline.getEvents();
    const readers = [];

    for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
      readers.splice(readers.length, 0, ...this.room.getUsersReadUpTo(liveEvents[i]));
      if (mEvent === liveEvents[i]) break;
    }

    return [...new Set(readers)];
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
    this._listenRoomTimeline = (event, room, toStartOfTimeline, removed, data) => {
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

    this._listenDecryptEvent = (event) => {
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

    this.matrixClient.on('Room.timeline', this._listenRoomTimeline);
    this.matrixClient.on('Room.redaction', this._listenRedaction);
    this.matrixClient.on('Event.decrypted', this._listenDecryptEvent);
    this.matrixClient.on('RoomMember.typing', this._listenTypingEvent);
    this.matrixClient.on('Room.receipt', this._listenReciptEvent);
  }

  removeInternalListeners() {
    if (!this.initialized) return;
    this.matrixClient.removeListener('Room.timeline', this._listenRoomTimeline);
    this.matrixClient.removeListener('Room.redaction', this._listenRedaction);
    this.matrixClient.removeListener('Event.decrypted', this._listenDecryptEvent);
    this.matrixClient.removeListener('RoomMember.typing', this._listenTypingEvent);
    this.matrixClient.removeListener('Room.receipt', this._listenReciptEvent);
  }
}

export default RoomTimeline;
