import EventEmitter from 'events';
import cons from './cons';

class Notifications extends EventEmitter {
  constructor(roomList) {
    super();

    this.matrixClient = roomList.matrixClient;
    this.roomList = roomList;

    this.roomIdToNoti = new Map();

    this._initNoti();
    this._listenEvents();

    // TODO:
    window.notifications = this;
  }

  _initNoti() {
    const addNoti = (roomId) => {
      const room = this.matrixClient.getRoom(roomId);
      if (this.doesRoomHaveUnread(room) === false) return;
      const total = room.getUnreadNotificationCount('total');
      const highlight = room.getUnreadNotificationCount('highlight');
      const noti = this.getNoti(room.roomId);
      this._setNoti(room.roomId, total - noti.total, highlight - noti.highlight);
    };
    [...this.roomList.rooms].forEach(addNoti);
    [...this.roomList.directs].forEach(addNoti);
  }

  doesRoomHaveUnread(room) {
    const userId = this.matrixClient.getUserId();
    const readUpToId = room.getEventReadUpTo(userId);
    const supportEvents = ['m.room.message', 'm.room.encrypted', 'm.sticker'];

    if (room.timeline.length
      && room.timeline[room.timeline.length - 1].sender
      && room.timeline[room.timeline.length - 1].sender.userId === userId
      && room.timeline[room.timeline.length - 1].getType() !== 'm.room.member') {
      return false;
    }

    for (let i = room.timeline.length - 1; i >= 0; i -= 1) {
      const event = room.timeline[i];

      if (event.getId() === readUpToId) return false;

      if (supportEvents.includes(event.getType())) {
        return true;
      }
    }
    return true;
  }

  getNoti(roomId) {
    return this.roomIdToNoti.get(roomId) || { total: 0, highlight: 0, from: null };
  }

  hasNoti(roomId) {
    return this.roomIdToNoti.has(roomId);
  }

  _setNoti(roomId, total, highlight, childId) {
    const noti = this.getNoti(roomId);

    noti.total += total;
    noti.highlight += highlight;
    if (childId) {
      if (noti.from === null) noti.from = new Set();
      noti.from.add(childId);
    }

    this.roomIdToNoti.set(roomId, noti);
    this.emit(cons.events.notification.NOTI_CHANGED, roomId);

    const parentIds = this.roomList.roomIdToParents.get(roomId);
    if (typeof parentIds === 'undefined') return;
    [...parentIds].forEach((parentId) => this._setNoti(parentId, total, highlight, roomId));
  }

  _deleteNoti(roomId, total, highlight, childId) {
    if (this.roomIdToNoti.has(roomId) === false) return;

    const noti = this.getNoti(roomId);
    noti.total -= total;
    noti.highlight -= highlight;
    if (childId && noti.from !== null) {
      noti.from.delete(childId);
    }
    if (noti.from === null || noti.from.size === 0) {
      this.roomIdToNoti.delete(roomId);
      this.emit(cons.events.notification.FULL_READ, roomId);
    } else {
      this.roomIdToNoti.set(roomId, noti);
      this.emit(cons.events.notification.NOTI_CHANGED, roomId);
    }

    const parentIds = this.roomList.roomIdToParents.get(roomId);
    if (typeof parentIds === 'undefined') return;
    [...parentIds].forEach((parentId) => this._deleteNoti(parentId, total, highlight, roomId));
  }

  _listenEvents() {
    this.matrixClient.on('Room.timeline', (mEvent, room) => {
      const supportEvents = ['m.room.message', 'm.room.encrypted', 'm.sticker'];
      if (!supportEvents.includes(mEvent.getType())) return;

      const lastTimelineEvent = room.timeline[room.timeline.length - 1];
      if (lastTimelineEvent.getId() !== mEvent.getId()) return;
      if (mEvent.getSender() === this.matrixClient.getUserId()) return;

      const total = room.getUnreadNotificationCount('total');
      const highlight = room.getUnreadNotificationCount('highlight');

      const noti = this.getNoti(room.roomId);
      this._setNoti(room.roomId, total - noti.total, highlight - noti.highlight);
    });

    this.matrixClient.on('Room.receipt', (mEvent, room) => {
      if (mEvent.getType() === 'm.receipt') {
        if (typeof mEvent.event.room_id === 'string') return;

        const content = mEvent.getContent();
        const readedEventId = Object.keys(content)[0];
        const readerUserId = Object.keys(content[readedEventId]['m.read'])[0];
        if (readerUserId !== this.matrixClient.getUserId()) return;

        if (this.hasNoti(room.roomId)) {
          const noti = this.getNoti(room.roomId);
          this._deleteNoti(room.roomId, noti.total, noti.highlight);
        }
      }
    });

    this.matrixClient.on('Room.myMembership', (room, membership) => {
      if (membership === 'leave' && this.hasNoti(room.roomId)) {
        const noti = this.getNoti(room.roomId);
        this._deleteNoti(room.roomId, noti.total, noti.highlight);
      }
    });
  }
}

export default Notifications;
