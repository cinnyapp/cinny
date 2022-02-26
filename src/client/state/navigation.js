import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

class Navigation extends EventEmitter {
  constructor() {
    super();

    this.selectedTab = cons.tabs.HOME;
    this.selectedSpaceId = null;
    this.selectedSpacePath = [cons.tabs.HOME];

    this.selectedRoomId = null;
    this.isRoomSettings = false;
    this.recentRooms = [];

    this.isRawModalVisible = false;
  }

  _setSpacePath(roomId) {
    if (roomId === null || roomId === cons.tabs.HOME) {
      this.selectedSpacePath = [cons.tabs.HOME];
      return;
    }
    if (this.selectedSpacePath.includes(roomId)) {
      const spIndex = this.selectedSpacePath.indexOf(roomId);
      this.selectedSpacePath = this.selectedSpacePath.slice(0, spIndex + 1);
      return;
    }
    this.selectedSpacePath.push(roomId);
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

  setIsRawModalVisible(visible) {
    this.isRawModalVisible = visible;
  }

  navigate(action) {
    const actions = {
      [cons.actions.navigation.SELECT_TAB]: () => {
        this.selectedTab = action.tabId;
        if (this.selectedTab !== cons.tabs.DIRECTS) {
          if (this.selectedTab === cons.tabs.HOME) {
            this.selectedSpacePath = [cons.tabs.HOME];
            this.selectedSpaceId = null;
          } else {
            this.selectedSpacePath = [this.selectedTab];
            this.selectedSpaceId = this.selectedTab;
          }
          this.emit(cons.events.navigation.SPACE_SELECTED, this.selectedSpaceId);
        } else this.selectedSpaceId = null;
        this.emit(cons.events.navigation.TAB_SELECTED, this.selectedTab);
      },
      [cons.actions.navigation.SELECT_SPACE]: () => {
        this._setSpacePath(action.roomId);
        this.selectedSpaceId = action.roomId === cons.tabs.HOME ? null : action.roomId;
        this.emit(cons.events.navigation.SPACE_SELECTED, this.selectedSpaceId);
      },
      [cons.actions.navigation.SELECT_ROOM]: () => {
        const prevSelectedRoomId = this.selectedRoomId;
        this.selectedRoomId = action.roomId;
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
          action.eventId,
        );
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
      [cons.actions.navigation.OPEN_INVITE_USER]: () => {
        this.emit(cons.events.navigation.INVITE_USER_OPENED, action.roomId, action.searchTerm);
      },
      [cons.actions.navigation.OPEN_PROFILE_VIEWER]: () => {
        this.emit(cons.events.navigation.PROFILE_VIEWER_OPENED, action.userId, action.roomId);
      },
      [cons.actions.navigation.OPEN_SETTINGS]: () => {
        this.emit(cons.events.navigation.SETTINGS_OPENED);
      },
      [cons.actions.navigation.OPEN_EMOJIBOARD]: () => {
        this.emit(
          cons.events.navigation.EMOJIBOARD_OPENED,
          action.cords, action.requestEmojiCallback,
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
    };
    actions[action.type]?.();
  }
}

const navigation = new Navigation();
appDispatcher.register(navigation.navigate.bind(navigation));

export default navigation;
