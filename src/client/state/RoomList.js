import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

function isMEventSpaceChild(mEvent) {
  return mEvent.getType() === 'm.space.child' && Object.keys(mEvent.getContent()).length > 0;
}

/**
 * @param {() => boolean} callback if return true wait will over else callback will be called again.
 * @param {number} timeout timeout to callback
 * @param {number} maxTry maximum callback try > 0. -1 means no limit
 */
async function waitFor(callback, timeout = 400, maxTry = -1) {
  if (maxTry === 0) return false;
  const isOver = async () => new Promise((resolve) => {
    setTimeout(() => resolve(callback()), timeout);
  });

  if (await isOver()) return true;
  return waitFor(callback, timeout, maxTry - 1);
}

class RoomList extends EventEmitter {
  constructor(matrixClient) {
    super();
    this.matrixClient = matrixClient;
    this.mDirects = this.getMDirects();

    // Contains roomId to parent spaces roomId mapping of all spaces children.
    // No matter if you have joined those children rooms or not.
    this.roomIdToParents = new Map();

    this.inviteDirects = new Set();
    this.inviteSpaces = new Set();
    this.inviteRooms = new Set();

    this.directs = new Set();
    this.spaces = new Set();
    this.rooms = new Set();

    this.processingRooms = new Map();

    this._populateRooms();
    this._listenEvents();

    appDispatcher.register(this.roomActions.bind(this));
  }

  isOrphan(roomId) {
    return !this.roomIdToParents.has(roomId);
  }

  getOrphanSpaces() {
    return [...this.spaces].filter((roomId) => !this.roomIdToParents.has(roomId));
  }

  getOrphanRooms() {
    return [...this.rooms].filter((roomId) => !this.roomIdToParents.has(roomId));
  }

  getOrphans() {
    const rooms = [...this.spaces].concat([...this.rooms]);
    return rooms.filter((roomId) => !this.roomIdToParents.has(roomId));
  }

  getSpaceChildren(roomId) {
    const space = this.matrixClient.getRoom(roomId);
    if (space === null) return null;
    const mSpaceChild = space?.currentState.getStateEvents('m.space.child');

    const children = [];
    mSpaceChild.forEach((mEvent) => {
      const childId = mEvent.event.state_key;
      if (isMEventSpaceChild(mEvent)) children.push(childId);
    });
    return children;
  }

  getCategorizedSpaces(spaceIds) {
    const categorized = new Map();

    const categorizeSpace = (spaceId) => {
      if (categorized.has(spaceId)) return;
      const mappedChild = new Set();
      categorized.set(spaceId, mappedChild);

      const child = this.getSpaceChildren(spaceId);

      child.forEach((childId) => {
        const room = this.matrixClient.getRoom(childId);
        if (room === null || room.getMyMembership() !== 'join') return;
        if (room.isSpaceRoom()) categorizeSpace(childId);
        else mappedChild.add(childId);
      });
    };
    spaceIds.forEach(categorizeSpace);

    return categorized;
  }

  addToRoomIdToParents(roomId, parentRoomId) {
    if (!this.roomIdToParents.has(roomId)) {
      this.roomIdToParents.set(roomId, new Set());
    }
    const parents = this.roomIdToParents.get(roomId);
    parents.add(parentRoomId);
  }

  removeFromRoomIdToParents(roomId, parentRoomId) {
    if (!this.roomIdToParents.has(roomId)) return;
    const parents = this.roomIdToParents.get(roomId);
    parents.delete(parentRoomId);
    if (parents.size === 0) this.roomIdToParents.delete(roomId);
  }

  getAllParentSpaces(roomId) {
    const allParents = new Set();

    const addAllParentIds = (rId) => {
      if (allParents.has(rId)) return;
      allParents.add(rId);

      const parents = this.roomIdToParents.get(rId);
      if (parents === undefined) return;

      parents.forEach((id) => addAllParentIds(id));
    };
    addAllParentIds(roomId);
    allParents.delete(roomId);
    return allParents;
  }

  addToSpaces(roomId) {
    this.spaces.add(roomId);

    const allParentSpaces = this.getAllParentSpaces(roomId);
    const spaceChildren = this.getSpaceChildren(roomId);
    spaceChildren?.forEach((childId) => {
      if (allParentSpaces.has(childId)) return;
      this.addToRoomIdToParents(childId, roomId);
    });
  }

  deleteFromSpaces(roomId) {
    this.spaces.delete(roomId);

    const spaceChildren = this.getSpaceChildren(roomId);
    spaceChildren?.forEach((childId) => {
      this.removeFromRoomIdToParents(childId, roomId);
    });
  }

  roomActions(action) {
    const addRoom = (roomId, isDM) => {
      const myRoom = this.matrixClient.getRoom(roomId);
      if (myRoom === null) return false;

      if (isDM) this.directs.add(roomId);
      else if (myRoom.isSpaceRoom()) this.addToSpaces(roomId);
      else this.rooms.add(roomId);
      return true;
    };
    const actions = {
      [cons.actions.room.JOIN]: () => {
        if (addRoom(action.roomId, action.isDM)) {
          setTimeout(() => {
            this.emit(cons.events.roomList.ROOM_JOINED, action.roomId);
            this.emit(cons.events.roomList.ROOMLIST_UPDATED);
          }, 100);
        } else {
          this.processingRooms.set(action.roomId, {
            roomId: action.roomId,
            isDM: action.isDM,
            task: 'JOIN',
          });
        }
      },
      [cons.actions.room.CREATE]: () => {
        if (addRoom(action.roomId, action.isDM)) {
          setTimeout(() => {
            this.emit(cons.events.roomList.ROOM_CREATED, action.roomId);
            this.emit(cons.events.roomList.ROOM_JOINED, action.roomId);
            this.emit(cons.events.roomList.ROOMLIST_UPDATED);
          }, 100);
        } else {
          this.processingRooms.set(action.roomId, {
            roomId: action.roomId,
            isDM: action.isDM,
            task: 'CREATE',
          });
        }
      },
    };
    actions[action.type]?.();
  }

  getMDirects() {
    const mDirectsId = new Set();
    const mDirect = this.matrixClient
      .getAccountData('m.direct')
      ?.getContent();

    if (typeof mDirect === 'undefined') return mDirectsId;

    Object.keys(mDirect).forEach((direct) => {
      mDirect[direct].forEach((directId) => mDirectsId.add(directId));
    });

    return mDirectsId;
  }

  _populateRooms() {
    this.directs.clear();
    this.roomIdToParents.clear();
    this.spaces.clear();
    this.rooms.clear();
    this.inviteDirects.clear();
    this.inviteSpaces.clear();
    this.inviteRooms.clear();
    this.matrixClient.getRooms().forEach((room) => {
      const { roomId } = room;
      const tombstone = room.currentState.events.get('m.room.tombstone');
      if (tombstone?.get('') !== undefined) {
        const repRoomId = tombstone.get('').getContent().replacement_room;
        const repRoomMembership = this.matrixClient.getRoom(repRoomId)?.getMyMembership();
        if (repRoomMembership === 'join') return;
      }

      if (room.getMyMembership() === 'invite') {
        if (this._isDMInvite(room)) this.inviteDirects.add(roomId);
        else if (room.isSpaceRoom()) this.inviteSpaces.add(roomId);
        else this.inviteRooms.add(roomId);
        return;
      }

      if (room.getMyMembership() !== 'join') return;

      if (this.mDirects.has(roomId)) this.directs.add(roomId);
      else if (room.isSpaceRoom()) this.addToSpaces(roomId);
      else this.rooms.add(roomId);
    });
  }

  _isDMInvite(room) {
    if (this.mDirects.has(room.roomId)) return true;
    const me = room.getMember(this.matrixClient.getUserId());
    const myEventContent = me.events.member.getContent();
    return myEventContent.membership === 'invite' && myEventContent.is_direct;
  }

  _listenEvents() {
    // Update roomList when m.direct changes
    this.matrixClient.on('accountData', (event) => {
      if (event.getType() !== 'm.direct') return;

      const latestMDirects = this.getMDirects();

      latestMDirects.forEach((directId) => {
        if (this.mDirects.has(directId)) return;
        this.mDirects.add(directId);

        const myRoom = this.matrixClient.getRoom(directId);
        if (myRoom === null) return;
        if (myRoom.getMyMembership() === 'join') {
          this.directs.add(directId);
          this.rooms.delete(directId);
          this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        }
      });

      [...this.directs].forEach((directId) => {
        if (latestMDirects.has(directId)) return;
        this.mDirects.delete(directId);

        const myRoom = this.matrixClient.getRoom(directId);
        if (myRoom === null) return;
        if (myRoom.getMyMembership() === 'join') {
          this.directs.delete(directId);
          this.rooms.add(directId);
          this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        }
      });
    });

    this.matrixClient.on('Room.name', (room) => {
      this.emit(cons.events.roomList.ROOMLIST_UPDATED);
      this.emit(cons.events.roomList.ROOM_PROFILE_UPDATED, room.roomId);
    });

    this.matrixClient.on('RoomState.events', (mEvent, state) => {
      if (mEvent.getType() === 'm.space.child') {
        const roomId = mEvent.event.room_id;
        const childId = mEvent.event.state_key;
        if (isMEventSpaceChild(mEvent)) {
          const allParentSpaces = this.getAllParentSpaces(roomId);
          // only add if it doesn't make a cycle
          if (!allParentSpaces.has(childId)) {
            this.addToRoomIdToParents(childId, roomId);
          }
        } else {
          this.removeFromRoomIdToParents(childId, roomId);
        }
        this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        return;
      }
      if (mEvent.getType() === 'm.room.join_rules') {
        this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        return;
      }
      if (['m.room.avatar', 'm.room.topic'].includes(mEvent.getType())) {
        if (mEvent.getType() === 'm.room.avatar') {
          this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        }
        this.emit(cons.events.roomList.ROOM_PROFILE_UPDATED, state.roomId);
      }
    });

    this.matrixClient.on('Room.myMembership', async (room, membership, prevMembership) => {
      // room => prevMembership = null | invite | join | leave | kick | ban | unban
      // room => membership = invite | join | leave | kick | ban | unban
      const { roomId } = room;
      const isRoomReady = () => this.matrixClient.getRoom(roomId) !== null;
      if (['join', 'invite'].includes(membership) && isRoomReady() === false) {
        if (await waitFor(isRoomReady, 200, 100) === false) return;
      }

      if (membership === 'unban') return;

      if (membership === 'invite') {
        if (this._isDMInvite(room)) this.inviteDirects.add(roomId);
        else if (room.isSpaceRoom()) this.inviteSpaces.add(roomId);
        else this.inviteRooms.add(roomId);

        this.emit(cons.events.roomList.INVITELIST_UPDATED, roomId);
        return;
      }

      if (prevMembership === 'invite') {
        if (this.inviteDirects.has(roomId)) this.inviteDirects.delete(roomId);
        else if (this.inviteSpaces.has(roomId)) this.inviteSpaces.delete(roomId);
        else this.inviteRooms.delete(roomId);

        this.emit(cons.events.roomList.INVITELIST_UPDATED, roomId);
      }

      if (['leave', 'kick', 'ban'].includes(membership)) {
        if (this.directs.has(roomId)) this.directs.delete(roomId);
        else if (this.spaces.has(roomId)) this.deleteFromSpaces(roomId);
        else this.rooms.delete(roomId);
        this.emit(cons.events.roomList.ROOM_LEAVED, roomId);
        this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        return;
      }

      // when user create room/DM OR accept room/dm invite from this client.
      // we will update this.rooms/this.directs with user action
      if (membership === 'join' && this.processingRooms.has(roomId)) {
        const procRoomInfo = this.processingRooms.get(roomId);

        if (procRoomInfo.isDM) this.directs.add(roomId);
        else if (room.isSpaceRoom()) this.addToSpaces(roomId);
        else this.rooms.add(roomId);

        if (procRoomInfo.task === 'CREATE') this.emit(cons.events.roomList.ROOM_CREATED, roomId);
        this.emit(cons.events.roomList.ROOM_JOINED, roomId);
        this.emit(cons.events.roomList.ROOMLIST_UPDATED);

        this.processingRooms.delete(roomId);
        return;
      }

      if (this.mDirects.has(roomId) && membership === 'join') {
        this.directs.add(roomId);
        this.emit(cons.events.roomList.ROOM_JOINED, roomId);
        this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        return;
      }

      if (membership === 'join') {
        if (room.isSpaceRoom()) this.addToSpaces(roomId);
        else this.rooms.add(roomId);
        this.emit(cons.events.roomList.ROOM_JOINED, roomId);
        this.emit(cons.events.roomList.ROOMLIST_UPDATED);
      }
    });
  }
}
export default RoomList;
