import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

function isMEventSpaceChild(mEvent) {
  return mEvent.getType() === 'm.space.child' && Object.keys(mEvent.getContent()).length > 0;
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
        if (room === null) return;
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
        const myRoom = this.matrixClient.getRoom(directId);
        if (this.mDirects.has(directId)) return;

        // Update mDirects
        this.mDirects.add(directId);

        if (myRoom === null) return;

        if (this._isDMInvite(myRoom)) return;

        if (myRoom.getMyMembership === 'join' && !this.directs.has(directId)) {
          this.directs.add(directId);
        }

        // Newly added room.
        // at this time my membership can be invite | join
        if (myRoom.getMyMembership() === 'join' && this.rooms.has(directId)) {
          // found a DM which accidentally gets added to this.rooms
          this.rooms.delete(directId);
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

    this.matrixClient.on('Room.myMembership', (room, membership, prevMembership) => {
      // room => prevMembership = null | invite | join | leave | kick | ban | unban
      // room => membership = invite | join | leave | kick | ban | unban
      const { roomId } = room;

      if (membership === 'unban') return;

      // When user_reject/sender_undo room invite
      if (prevMembership === 'invite') {
        if (this.inviteDirects.has(roomId)) this.inviteDirects.delete(roomId);
        else if (this.inviteSpaces.has(roomId)) this.inviteSpaces.delete(roomId);
        else this.inviteRooms.delete(roomId);

        this.emit(cons.events.roomList.INVITELIST_UPDATED, roomId);
      }

      // When user get invited
      if (membership === 'invite') {
        if (this._isDMInvite(room)) this.inviteDirects.add(roomId);
        else if (room.isSpaceRoom()) this.inviteSpaces.add(roomId);
        else this.inviteRooms.add(roomId);

        this.emit(cons.events.roomList.INVITELIST_UPDATED, roomId);
        return;
      }

      // When user join room (first time) or start DM.
      if ((prevMembership === null || prevMembership === 'invite') && membership === 'join') {
        // when user create room/DM OR accept room/dm invite from this client.
        // we will update this.rooms/this.directs with user action
        if (this.directs.has(roomId) || this.spaces.has(roomId) || this.rooms.has(roomId)) return;

        if (this.processingRooms.has(roomId)) {
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
        if (room.isSpaceRoom()) {
          this.addToSpaces(roomId);

          this.emit(cons.events.roomList.ROOM_JOINED, roomId);
          this.emit(cons.events.roomList.ROOMLIST_UPDATED);
          return;
        }

        // below code intented to work when user create room/DM
        // OR accept room/dm invite from other client.
        // and we have to update our client. (it's ok to have 10sec delay)

        // create a buffer of 10sec and HOPE client.accoundData get updated
        // then accoundData event listener will update this.mDirects.
        // and we will be able to know if it's a DM.
        // ----------
        // less likely situation:
        // if we don't get accountData with 10sec then:
        // we will temporary add it to this.rooms.
        // and in future when accountData get updated
        // accountData listener will automatically goona REMOVE it from this.rooms
        // and will ADD it to this.directs
        // and emit the cons.events.roomList.ROOMLIST_UPDATED to update the UI.

        setTimeout(() => {
          if (this.directs.has(roomId) || this.spaces.has(roomId) || this.rooms.has(roomId)) return;
          if (this.mDirects.has(roomId)) this.directs.add(roomId);
          else this.rooms.add(roomId);

          this.emit(cons.events.roomList.ROOM_JOINED, roomId);
          this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        }, 10000);
        return;
      }

      // when room is a DM add/remove it from DM's and return.
      if (this.directs.has(roomId)) {
        if (membership === 'leave' || membership === 'kick' || membership === 'ban') {
          this.directs.delete(roomId);
          this.emit(cons.events.roomList.ROOM_LEAVED, roomId);
        }
      }
      if (this.mDirects.has(roomId)) {
        if (membership === 'join') {
          this.directs.add(roomId);
          this.emit(cons.events.roomList.ROOM_JOINED, roomId);
        }
        this.emit(cons.events.roomList.ROOMLIST_UPDATED);
        return;
      }
      // when room is not a DM add/remove it from rooms.
      if (membership === 'leave' || membership === 'kick' || membership === 'ban') {
        if (room.isSpaceRoom()) this.deleteFromSpaces(roomId);
        else this.rooms.delete(roomId);
        this.emit(cons.events.roomList.ROOM_LEAVED, roomId);
      }
      if (membership === 'join') {
        if (room.isSpaceRoom()) this.addToSpaces(roomId);
        else this.rooms.add(roomId);
        this.emit(cons.events.roomList.ROOM_JOINED, roomId);
      }
      this.emit(cons.events.roomList.ROOMLIST_UPDATED);
    });
  }
}
export default RoomList;
