import EventEmitter from 'events';
import initMatrix from '../initMatrix';
import cons from './cons';

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

  if (typeof myMap.get(relateToId) === 'undefined') myMap.set(relateToId, []);
  myMap.get(relateToId).push(mEvent);
  return mEvent;
}

class RoomTimeline extends EventEmitter {
  constructor(roomId) {
    super();
    this.matrixClient = initMatrix.matrixClient;
    this.roomId = roomId;
    this.room = this.matrixClient.getRoom(roomId);

    this.timeline = new Map();
    this.editedTimeline = new Map();
    this.reactionTimeline = new Map();

    this.isOngoingPagination = false;
    this.ongoingDecryptionCount = 0;
    this.typingMembers = new Set();

    this._listenRoomTimeline = (event, room) => {
      if (room.roomId !== this.roomId) return;

      if (event.isEncrypted()) {
        this.ongoingDecryptionCount += 1;
        return;
      }

      if (this.ongoingDecryptionCount !== 0) return;
      if (this.isOngoingPagination) return;

      this.addToTimeline(event);
      this.emit(cons.events.roomTimeline.EVENT);
    };

    this._listenDecryptEvent = (event) => {
      if (event.getRoomId() !== this.roomId) return;

      if (this.ongoingDecryptionCount > 0) {
        this.ongoingDecryptionCount -= 1;
      }
      if (this.ongoingDecryptionCount > 0) return;

      if (this.isOngoingPagination) return;
      this.addToTimeline(event);
      this.emit(cons.events.roomTimeline.EVENT);
    };

    this._listenRedaction = (event, room) => {
      if (room.roomId !== this.roomId) return;
      this.timeline.delete(event.getId());
      this.editedTimeline.delete(event.getId());
      this.reactionTimeline.delete(event.getId());
      this.emit(cons.events.roomTimeline.EVENT);
    };

    this._listenTypingEvent = (event, member) => {
      if (member.roomId !== this.roomId) return;

      const isTyping = member.typing;
      if (isTyping) this.typingMembers.add(member.userId);
      else this.typingMembers.delete(member.userId);
      this.emit(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, new Set([...this.typingMembers]));
    };
    this._listenReciptEvent = (event, room) => {
      if (room.roomId !== this.roomId) return;
      const receiptContent = event.getContent();
      if (this.timeline.length === 0) return;
      const tmlLastEvent = room.timeline[room.timeline.length - 1];
      const lastEventId = tmlLastEvent.getId();
      const lastEventRecipt = receiptContent[lastEventId];
      if (typeof lastEventRecipt === 'undefined') return;
      if (lastEventRecipt['m.read']) {
        this.emit(cons.events.roomTimeline.READ_RECEIPT);
      }
    };

    this.matrixClient.on('Room.timeline', this._listenRoomTimeline);
    this.matrixClient.on('Room.redaction', this._listenRedaction);
    this.matrixClient.on('Event.decrypted', this._listenDecryptEvent);
    this.matrixClient.on('RoomMember.typing', this._listenTypingEvent);
    this.matrixClient.on('Room.receipt', this._listenReciptEvent);

    // TODO: remove below line when release
    window.selectedRoom = this;

    if (this.isEncryptedRoom()) this.room.decryptAllEvents();
    this._populateTimelines();
  }

  isEncryptedRoom() {
    return this.matrixClient.isRoomEncrypted(this.roomId);
  }

  addToTimeline(mEvent) {
    if (isReaction(mEvent)) {
      addToMap(this.reactionTimeline, mEvent);
      return;
    }
    if (!cons.supportEventTypes.includes(mEvent.getType())) return;
    if (isEdited(mEvent)) {
      addToMap(this.editedTimeline, mEvent);
      return;
    }
    this.timeline.set(mEvent.getId(), mEvent);
  }

  _populateTimelines() {
    this.timeline.clear();
    this.reactionTimeline.clear();
    this.editedTimeline.clear();
    this.room.timeline.forEach((mEvent) => this.addToTimeline(mEvent));
  }

  paginateBack() {
    if (this.isOngoingPagination) return;
    this.isOngoingPagination = true;

    const oldSize = this.timeline.size;
    const MSG_LIMIT = 30;
    this.matrixClient.scrollback(this.room, MSG_LIMIT).then(async (room) => {
      if (room.oldState.paginationToken === null) {
        // We have reached start of the timeline
        this.isOngoingPagination = false;
        if (this.isEncryptedRoom()) await this.room.decryptAllEvents();
        this.emit(cons.events.roomTimeline.PAGINATED, false, 0);
        return;
      }
      this._populateTimelines();
      const loaded = this.timeline.size - oldSize;

      if (this.isEncryptedRoom()) await this.room.decryptAllEvents();
      this.isOngoingPagination = false;
      this.emit(cons.events.roomTimeline.PAGINATED, true, loaded);
    });
  }

  removeInternalListeners() {
    this.matrixClient.removeListener('Room.timeline', this._listenRoomTimeline);
    this.matrixClient.removeListener('Room.redaction', this._listenRedaction);
    this.matrixClient.removeListener('Event.decrypted', this._listenDecryptEvent);
    this.matrixClient.removeListener('RoomMember.typing', this._listenTypingEvent);
    this.matrixClient.removeListener('Room.receipt', this._listenReciptEvent);
  }
}

export default RoomTimeline;
