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

    this.spaceToRoom = new Map();

    this.rawModelStack = [];
  }

  _addToSpacePath(roomId, asRoot) {
    if (typeof roomId !== 'string') {
      this.selectedSpacePath = [cons.tabs.HOME];
      return;
    }
    if (asRoot) {
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

  _mapRoomToSpace(roomId) {
    const { roomList, accountData } = this.initMatrix;
    if (
      this.selectedTab === cons.tabs.HOME
      && roomList.rooms.has(roomId)
      && !roomList.roomIdToParents.has(roomId)
    ) {
      this.spaceToRoom.set(cons.tabs.HOME, {
        roomId,
        timestamp: Date.now(),
      });
      return;
    }
    if (this.selectedTab === cons.tabs.DIRECTS && roomList.directs.has(roomId)) {
      this.spaceToRoom.set(cons.tabs.DIRECTS, {
        roomId,
        timestamp: Date.now(),
      });
      return;
    }

    const parents = roomList.roomIdToParents.get(roomId);
    if (!parents) return;
    if (parents.has(this.selectedSpaceId)) {
      this.spaceToRoom.set(this.selectedSpaceId, {
        roomId,
        timestamp: Date.now(),
      });
    } else if (accountData.categorizedSpaces.has(this.selectedSpaceId)) {
      const categories = roomList.getCategorizedSpaces([this.selectedSpaceId]);
      const parent = [...parents].find((pId) => categories.has(pId));
      if (parent) {
        this.spaceToRoom.set(parent, {
          roomId,
          timestamp: Date.now(),
        });
      }
    }
  }

  _selectRoom(roomId, eventId) {
    const prevSelectedRoomId = this.selectedRoomId;
    this.selectedRoomId = roomId;
    if (prevSelectedRoomId !== roomId) this._mapRoomToSpace(roomId);
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

  _selectTabWithRoom(roomId) {
    const { roomList, accountData } = this.initMatrix;
    const { categorizedSpaces } = accountData;

    if (roomList.isOrphan(roomId)) {
      if (roomList.directs.has(roomId)) {
        this._selectSpace(null, true, false);
        this._selectTab(cons.tabs.DIRECTS, false);
        return;
      }
      this._selectSpace(null, true, false);
      this._selectTab(cons.tabs.HOME, false);
      return;
    }

    const parents = roomList.roomIdToParents.get(roomId);

    if (parents.has(this.selectedSpaceId)) {
      return;
    }

    if (categorizedSpaces.has(this.selectedSpaceId)) {
      const categories = roomList.getCategorizedSpaces([this.selectedSpaceId]);
      if ([...parents].find((pId) => categories.has(pId))) {
        // No need to select tab
        // As one of parent is child of selected categorized space.
        return;
      }
    }

    const spaceInPath = [...this.selectedSpacePath].reverse().find((sId) => parents.has(sId));
    if (spaceInPath) {
      this._selectSpace(spaceInPath, false, false);
      return;
    }

    if (roomList.directs.has(roomId)) {
      this._selectSpace(null, true, false);
      this._selectTab(cons.tabs.DIRECTS, false);
      return;
    }

    if (parents.size > 0) {
      const sortedParents = [...parents].sort((p1, p2) => {
        const t1 = this.spaceToRoom.get(p1)?.timestamp ?? 0;
        const t2 = this.spaceToRoom.get(p2)?.timestamp ?? 0;
        return t2 - t1;
      });
      this._selectSpace(sortedParents[0], true, false);
      this._selectTab(sortedParents[0], false);
    }
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

  _getLatestSelectedRoomId(spaceIds) {
    let ts = 0;
    let roomId = null;

    spaceIds.forEach((sId) => {
      const data = this.spaceToRoom.get(sId);
      if (!data) return;
      const newTs = data.timestamp;
      if (newTs > ts) {
        ts = newTs;
        roomId = data.roomId;
      }
    });
    return roomId;
  }

  _selectTab(tabId, selectRoom = true) {
    this.selectedTab = tabId;
    if (selectRoom) this._selectRoomWithTab(this.selectedTab);
    this.emit(cons.events.navigation.TAB_SELECTED, this.selectedTab);
  }

  _selectSpace(roomId, asRoot, selectRoom = true) {
    this._addToSpacePath(roomId, asRoot);
    this.selectedSpaceId = roomId;
    if (!asRoot && selectRoom) this._selectRoomWithSpace(this.selectedSpaceId);
    this.emit(cons.events.navigation.SPACE_SELECTED, this.selectedSpaceId);
  }

  _selectRoomWithSpace(spaceId) {
    if (!spaceId) return;
    const { roomList, accountData, matrixClient } = this.initMatrix;
    const { categorizedSpaces } = accountData;

    const data = this.spaceToRoom.get(spaceId);
    if (data && !categorizedSpaces.has(spaceId)) {
      this._selectRoom(data.roomId);
      return;
    }

    const children = [];

    if (categorizedSpaces.has(spaceId)) {
      const categories = roomList.getCategorizedSpaces([spaceId]);

      const latestSelectedRoom = this._getLatestSelectedRoomId([...categories.keys()]);

      if (latestSelectedRoom) {
        this._selectRoom(latestSelectedRoom);
        return;
      }

      categories?.forEach((categoryId) => {
        categoryId?.forEach((childId) => {
          children.push(childId);
        });
      });
    } else {
      roomList.getSpaceChildren(spaceId).forEach((id) => {
        if (matrixClient.getRoom(id)?.isSpaceRoom() === false) {
          children.push(id);
        }
      });
    }

    if (!children) {
      this._selectRoom(null);
      return;
    }

    this._selectRoom(this._getLatestActiveRoomId(children));
  }

  _selectRoomWithTab(tabId) {
    const { roomList } = this.initMatrix;
    if (tabId === cons.tabs.HOME || tabId === cons.tabs.DIRECTS) {
      const data = this.spaceToRoom.get(tabId);
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
        const roomId = (
          action.tabId !== cons.tabs.HOME && action.tabId !== cons.tabs.DIRECTS
        ) ? action.tabId : null;

        this._selectSpace(roomId, true);
        this._selectTab(action.tabId);
      },
      [cons.actions.navigation.SELECT_SPACE]: () => {
        this._selectSpace(action.roomId, false);
      },
      [cons.actions.navigation.SELECT_ROOM]: () => {
        if (action.roomId) this._selectTabWithRoom(action.roomId);
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
