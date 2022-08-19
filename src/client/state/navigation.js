import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

class Navigation extends EventEmitter {
  constructor() {
    super();
    // this will attached by initMatrix
    this.initMatrix = {};

    this.selectedTab = cons.tabs.HOME;
    this.selectedSpaceId = null;
    this.selectedSpacePath = [cons.tabs.HOME];

    this.selectedRoomId = null;
    this.isRoomSettings = false;
    this.recentRooms = [];

    this.selectedSpaceToRoom = new Map();

    this.rawModelStack = [];
  }

  _setSpacePath(roomId, asBase) {
    if (typeof roomId !== 'string') {
      this.selectedSpacePath = [cons.tabs.HOME];
      return;
    }
    if (asBase) {
      this.selectedSpacePath = [roomId];
      return;
    }
    if (this.selectedSpacePath.includes(roomId)) {
      const spIndex = this.selectedSpacePath.indexOf(roomId);
      this.selectedSpacePath = this.selectedSpacePath.slice(0, spIndex + 1);
      return;
    }
    this.selectedSpacePath.push(roomId);
  }

  _addSelectedSpaceToRoom(roomId) {
    const { roomList } = this.initMatrix;
    if (
      this.selectedTab === cons.tabs.HOME
      && roomList.rooms.has(roomId)
      && !roomList.roomIdToParents.has(roomId)
    ) {
      this.selectedSpaceToRoom.set(cons.tabs.HOME, {
        roomId,
        timestamp: Date.now(),
      });
      return;
    }
    if (this.selectedTab === cons.tabs.DIRECTS && roomList.directs.has(roomId)) {
      this.selectedSpaceToRoom.set(cons.tabs.DIRECTS, {
        roomId,
        timestamp: Date.now(),
      });
      return;
    }

    const parents = roomList.roomIdToParents.get(roomId);
    if (!parents) return;

    if (parents.has(this.selectedSpaceId)) {
      this.selectedSpaceToRoom.set(this.selectedSpaceId, {
        roomId,
        timestamp: Date.now(),
      });
    }
  }

  _selectRoom(roomId, eventId) {
    const prevSelectedRoomId = this.selectedRoomId;
    this.selectedRoomId = roomId;
    this._addSelectedSpaceToRoom(roomId);
    this.removeRecentRoom(prevSelectedRoomId);
    this.addRecentRoom(prevSelectedRoomId);
    this.removeRecentRoom(this.selectedRoomId);
    if (this.isRoomSettings && typeof this.selectedRoomId === 'string') {
      this.isRoomSettings = !this.isRoomSettings;
      this.emit(cons.events.navigation.ROOM_SETTINGS_TOGGLED, this.isRoomSettings);
    }
    this.emit(
      cons.events.navigation.ROOM_SELECTED,
      this.selectedRoomId,
      prevSelectedRoomId,
      eventId,
    );
  }

  _getLatestActiveRoomId(roomIds) {
    const mx = this.initMatrix.matrixClient;

    let ts = 0;
    let roomId = null;
    roomIds.forEach((childId) => {
      const room = mx.getRoom(childId);
      if (!room) return;
      const newTs = room.getLastActiveTimestamp();
      if (newTs > ts) {
        ts = newTs;
        roomId = childId;
      }
    });
    return roomId;
  }

  _selectRoomWithSpace(spaceId) {
    if (!spaceId) return;
    const data = this.selectedSpaceToRoom.get(spaceId);
    if (data) {
      this._selectRoom(data.roomId);
      return;
    }

    const { roomList } = this.initMatrix;
    const children = roomList.getSpaceChildren(spaceId);
    if (!children) {
      this._selectRoom(null);
      return;
    }
    this._selectRoom(this._getLatestActiveRoomId(children));
  }

  _selectRoomWithTab(tabId) {
    const { roomList } = this.initMatrix;
    if (tabId === cons.tabs.HOME || tabId === cons.tabs.DIRECTS) {
      const data = this.selectedSpaceToRoom.get(tabId);
      if (data) {
        this._selectRoom(data.roomId);
        return;
      }
      const children = tabId === cons.tabs.HOME ? roomList.getOrphanRooms() : [...roomList.directs];
      this._selectRoom(this._getLatestActiveRoomId(children));
      return;
    }
    this._selectRoomWithSpace(tabId);
  }

  removeRecentRoom(roomId) {
    if (typeof roomId !== 'string') return;
    const roomIdIndex = this.recentRooms.indexOf(roomId);
    if (roomIdIndex >= 0) {
      this.recentRooms.splice(roomIdIndex, 1);
    }
  }

  addRecentRoom(roomId) {
    if (typeof roomId !== 'string') return;

    this.recentRooms.push(roomId);
    if (this.recentRooms.length > 10) {
      this.recentRooms.splice(0, 1);
    }
  }

  get isRawModalVisible() {
    return this.rawModelStack.length > 0;
  }

  setIsRawModalVisible(visible) {
    if (visible) this.rawModelStack.push(true);
    else this.rawModelStack.pop();
  }

  navigate(action) {
    const actions = {
      [cons.actions.navigation.SELECT_TAB]: () => {
        this.selectedTab = action.tabId;
        this._selectRoomWithTab(this.selectedTab);
        this.emit(cons.events.navigation.TAB_SELECTED, this.selectedTab);
      },
      [cons.actions.navigation.SELECT_SPACE]: () => {
        this._setSpacePath(action.roomId, action.asBase);
        this.selectedSpaceId = action.roomId;
        if (!action.asBase) this._selectRoomWithSpace(this.selectedSpaceId);
        this.emit(cons.events.navigation.SPACE_SELECTED, this.selectedSpaceId);
      },
      [cons.actions.navigation.SELECT_ROOM]: () => {
        this._selectRoom(action.roomId, action.eventId);
      },
      [cons.actions.navigation.OPEN_SPACE_SETTINGS]: () => {
        this.emit(cons.events.navigation.SPACE_SETTINGS_OPENED, action.roomId, action.tabText);
      },
      [cons.actions.navigation.OPEN_SPACE_MANAGE]: () => {
        this.emit(cons.events.navigation.SPACE_MANAGE_OPENED, action.roomId);
      },
      [cons.actions.navigation.OPEN_SPACE_ADDEXISTING]: () => {
        this.emit(cons.events.navigation.SPACE_ADDEXISTING_OPENED, action.roomId);
      },
      [cons.actions.navigation.TOGGLE_ROOM_SETTINGS]: () => {
        this.isRoomSettings = !this.isRoomSettings;
        this.emit(
          cons.events.navigation.ROOM_SETTINGS_TOGGLED,
          this.isRoomSettings,
          action.tabText,
        );
      },
      [cons.actions.navigation.OPEN_SHORTCUT_SPACES]: () => {
        this.emit(cons.events.navigation.SHORTCUT_SPACES_OPENED);
      },
      [cons.actions.navigation.OPEN_INVITE_LIST]: () => {
        this.emit(cons.events.navigation.INVITE_LIST_OPENED);
      },
      [cons.actions.navigation.OPEN_PUBLIC_ROOMS]: () => {
        this.emit(cons.events.navigation.PUBLIC_ROOMS_OPENED, action.searchTerm);
      },
      [cons.actions.navigation.OPEN_CREATE_ROOM]: () => {
        this.emit(
          cons.events.navigation.CREATE_ROOM_OPENED,
          action.isSpace,
          action.parentId,
        );
      },
      [cons.actions.navigation.OPEN_JOIN_ALIAS]: () => {
        this.emit(
          cons.events.navigation.JOIN_ALIAS_OPENED,
          action.term,
        );
      },
      [cons.actions.navigation.OPEN_INVITE_USER]: () => {
        this.emit(cons.events.navigation.INVITE_USER_OPENED, action.roomId, action.searchTerm);
      },
      [cons.actions.navigation.OPEN_PROFILE_VIEWER]: () => {
        this.emit(cons.events.navigation.PROFILE_VIEWER_OPENED, action.userId, action.roomId);
      },
      [cons.actions.navigation.OPEN_SETTINGS]: () => {
        this.emit(cons.events.navigation.SETTINGS_OPENED, action.tabText);
      },
      [cons.actions.navigation.OPEN_NAVIGATION]: () => {
        this.emit(cons.events.navigation.NAVIGATION_OPENED);
      },
      [cons.actions.navigation.OPEN_EMOJIBOARD]: () => {
        this.emit(
          cons.events.navigation.EMOJIBOARD_OPENED,
          action.cords,
          action.requestEmojiCallback,
        );
      },
      [cons.actions.navigation.OPEN_READRECEIPTS]: () => {
        this.emit(
          cons.events.navigation.READRECEIPTS_OPENED,
          action.roomId,
          action.userIds,
        );
      },
      [cons.actions.navigation.OPEN_VIEWSOURCE]: () => {
        this.emit(
          cons.events.navigation.VIEWSOURCE_OPENED,
          action.event,
        );
      },
      [cons.actions.navigation.CLICK_REPLY_TO]: () => {
        this.emit(
          cons.events.navigation.REPLY_TO_CLICKED,
          action.userId,
          action.eventId,
          action.body,
        );
      },
      [cons.actions.navigation.OPEN_SEARCH]: () => {
        this.emit(
          cons.events.navigation.SEARCH_OPENED,
          action.term,
        );
      },
      [cons.actions.navigation.OPEN_REUSABLE_CONTEXT_MENU]: () => {
        this.emit(
          cons.events.navigation.REUSABLE_CONTEXT_MENU_OPENED,
          action.placement,
          action.cords,
          action.render,
          action.afterClose,
        );
      },
      [cons.actions.navigation.OPEN_REUSABLE_DIALOG]: () => {
        this.emit(
          cons.events.navigation.REUSABLE_DIALOG_OPENED,
          action.title,
          action.render,
          action.afterClose,
        );
      },
      [cons.actions.navigation.OPEN_EMOJI_VERIFICATION]: () => {
        this.emit(
          cons.events.navigation.EMOJI_VERIFICATION_OPENED,
          action.request,
          action.targetDevice,
        );
      },
    };
    actions[action.type]?.();
  }
}

const navigation = new Navigation();
appDispatcher.register(navigation.navigate.bind(navigation));

export default navigation;
