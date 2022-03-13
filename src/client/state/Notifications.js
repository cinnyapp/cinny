import EventEmitter from 'events';
import renderAvatar from '../../app/atoms/avatar/render';
import { cssColorMXID } from '../../util/colorMXID';
import { selectRoom } from '../action/navigation';
import cons from './cons';
import navigation from './navigation';
import settings from './settings';

function isNotifEvent(mEvent) {
  const eType = mEvent.getType();
  if (!cons.supportEventTypes.includes(eType)) return false;
  if (eType === 'm.room.member') return false;

  if (mEvent.isRedacted()) return false;
  if (mEvent.getRelation()?.rel_type === 'm.replace') return false;

  return true;
}

class Notifications extends EventEmitter {
  constructor(roomList) {
    super();

    this.matrixClient = roomList.matrixClient;
    this.roomList = roomList;

    this.roomIdToNoti = new Map();

    this._initNoti();
    this._listenEvents();

    // Ask for permission by default after loading
    window.Notification?.requestPermission();

    // TODO:
    window.notifications = this;
  }

  _initNoti() {
    const addNoti = (roomId) => {
      const room = this.matrixClient.getRoom(roomId);
      if (this.doesRoomHaveUnread(room) === false) return;
      const total = room.getUnreadNotificationCount('total');
      const highlight = room.getUnreadNotificationCount('highlight');
      this._setNoti(room.roomId, total ?? 0, highlight ?? 0);
    };
    [...this.roomList.rooms].forEach(addNoti);
    [...this.roomList.directs].forEach(addNoti);
  }

  doesRoomHaveUnread(room) {
    const userId = this.matrixClient.getUserId();
    const readUpToId = room.getEventReadUpTo(userId);
    const liveEvents = room.getLiveTimeline().getEvents();

    if (liveEvents[liveEvents.length - 1]?.getSender() === userId) {
      return false;
    }

    for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
      const event = liveEvents[i];
      if (event.getId() === readUpToId) return false;
      if (isNotifEvent(event)) return true;
    }
    return true;
  }

  getNoti(roomId) {
    return this.roomIdToNoti.get(roomId) || { total: 0, highlight: 0, from: null };
  }

  getTotalNoti(roomId) {
    const { total } = this.getNoti(roomId);
    return total;
  }

  getHighlightNoti(roomId) {
    const { highlight } = this.getNoti(roomId);
    return highlight;
  }

  getFromNoti(roomId) {
    const { from } = this.getNoti(roomId);
    return from;
  }

  hasNoti(roomId) {
    return this.roomIdToNoti.has(roomId);
  }

  deleteNoti(roomId) {
    if (this.hasNoti(roomId)) {
      const noti = this.getNoti(roomId);
      this._deleteNoti(roomId, noti.total, noti.highlight);
    }
  }

  _setNoti(roomId, total, highlight) {
    const addNoti = (id, t, h, fromId) => {
      const prevTotal = this.roomIdToNoti.get(id)?.total ?? null;
      const noti = this.getNoti(id);

      noti.total += t;
      noti.highlight += h;

      if (fromId) {
        if (noti.from === null) noti.from = new Set();
        noti.from.add(fromId);
      }
      this.roomIdToNoti.set(id, noti);
      this.emit(cons.events.notifications.NOTI_CHANGED, id, noti.total, prevTotal);
    };

    const noti = this.getNoti(roomId);
    const addT = total - noti.total;
    const addH = highlight - noti.highlight;
    if (addT < 0 || addH < 0) return;

    addNoti(roomId, addT, addH);
    const allParentSpaces = this.roomList.getParentSpaces(roomId);
    allParentSpaces.forEach((spaceId) => {
      addNoti(spaceId, addT, addH, roomId);
    });
  }

  _deleteNoti(roomId, total, highlight) {
    const removeNoti = (id, t, h, fromId) => {
      if (this.roomIdToNoti.has(id) === false) return;

      const noti = this.getNoti(id);
      const prevTotal = noti.total;
      noti.total -= t;
      noti.highlight -= h;
      if (noti.total < 0) {
        noti.total = 0;
        noti.highlight = 0;
      }
      if (fromId && noti.from !== null) {
        if (!this.hasNoti(fromId)) noti.from.delete(fromId);
      }
      if (noti.from === null || noti.from.size === 0) {
        this.roomIdToNoti.delete(id);
        this.emit(cons.events.notifications.FULL_READ, id);
        this.emit(cons.events.notifications.NOTI_CHANGED, id, null, prevTotal);
      } else {
        this.roomIdToNoti.set(id, noti);
        this.emit(cons.events.notifications.NOTI_CHANGED, id, noti.total, prevTotal);
      }
    };

    removeNoti(roomId, total, highlight);
    const allParentSpaces = this.roomList.getParentSpaces(roomId);
    allParentSpaces.forEach((spaceId) => {
      removeNoti(spaceId, total, highlight, roomId);
    });
  }

  async _displayPopupNoti(mEvent, room) {
    if (!settings.showNotifications) return;

    const actions = this.matrixClient.getPushActionsForEvent(mEvent);
    if (!actions?.notify) return;

    if (navigation.selectedRoomId === room.roomId && document.visibilityState === 'visible') return;

    if (mEvent.isEncrypted()) {
      await mEvent.attemptDecryption(this.matrixClient.crypto);
    }

    let title;
    if (!mEvent.sender || room.name === mEvent.sender.name) {
      title = room.name;
    } else if (mEvent.sender) {
      title = `${mEvent.sender.name} (${room.name})`;
    }

    const iconSize = 36;
    const icon = await renderAvatar({
      text: mEvent.sender.name,
      bgColor: cssColorMXID(mEvent.getSender()),
      imageSrc: mEvent.sender?.getAvatarUrl(this.matrixClient.baseUrl, iconSize, iconSize, 'crop'),
      size: iconSize,
      borderRadius: 8,
      scale: 8,
    });

    const noti = new window.Notification(title, {
      body: mEvent.getContent().body,
      icon,
    });
    noti.onclick = () => selectRoom(room.roomId, mEvent.getId());
  }

  _listenEvents() {
    this.matrixClient.on('Room.timeline', (mEvent, room) => {
      if (room.isSpaceRoom()) return;
      if (!isNotifEvent(mEvent)) return;
      const liveEvents = room.getLiveTimeline().getEvents();

      const lastTimelineEvent = liveEvents[liveEvents.length - 1];
      if (lastTimelineEvent.getId() !== mEvent.getId()) return;
      if (mEvent.getSender() === this.matrixClient.getUserId()) return;

      const total = room.getUnreadNotificationCount('total');
      const highlight = room.getUnreadNotificationCount('highlight');

      this._setNoti(room.roomId, total ?? 0, highlight ?? 0);

      if (this.matrixClient.getSyncState() === 'SYNCING') {
        this._displayPopupNoti(mEvent, room);
      }
    });

    this.matrixClient.on('Room.receipt', (mEvent, room) => {
      if (mEvent.getType() === 'm.receipt') {
        if (room.isSpaceRoom()) return;
        const content = mEvent.getContent();
        const readedEventId = Object.keys(content)[0];
        const readerUserId = Object.keys(content[readedEventId]['m.read'])[0];
        if (readerUserId !== this.matrixClient.getUserId()) return;

        this.deleteNoti(room.roomId);
      }
    });

    this.matrixClient.on('Room.myMembership', (room, membership) => {
      if (membership === 'leave' && this.hasNoti(room.roomId)) {
        this.deleteNoti(room.roomId);
      }
    });
  }
}

export default Notifications;
