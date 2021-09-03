import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

class Navigation extends EventEmitter {
  constructor() {
    super();

    this.selectedTab = 'home';
    this.selectedSpaceId = null;
    this.selectedSpacePath = [];
    this.selectedRoomId = null;
    this.isPeopleDrawerVisible = true;

    // TODO:
    window.navigation = this;
  }

  _setSpacePath(roomId) {
    if (roomId === null) {
      this.selectedSpacePath = [];
      return;
    }
    if (this.selectedSpacePath.includes(roomId)) {
      const spIndex = this.selectedSpacePath.indexOf(roomId);
      this.selectedSpacePath = this.selectedSpacePath.slice(0, spIndex + 1);
      return;
    }
    this.selectedSpacePath.push(roomId);
  }

  navigate(action) {
    const actions = {
      [cons.actions.navigation.CHANGE_TAB]: () => {
        this.selectedTab = action.tabId;
        this.emit(cons.events.navigation.TAB_CHANGED, this.selectedTab);
      },
      [cons.actions.navigation.SELECT_SPACE]: () => {
        this._setSpacePath(action.roomId);
        this.selectedSpaceId = action.roomId;
        this.emit(cons.events.navigation.SPACE_SELECTED, action.roomId);
      },
      [cons.actions.navigation.SELECT_ROOM]: () => {
        const prevSelectedRoomId = this.selectedRoomId;
        this.selectedRoomId = action.roomId;
        this.emit(cons.events.navigation.ROOM_SELECTED, this.selectedRoomId, prevSelectedRoomId);
      },
      [cons.actions.navigation.TOGGLE_PEOPLE_DRAWER]: () => {
        this.isPeopleDrawerVisible = !this.isPeopleDrawerVisible;
        this.emit(cons.events.navigation.PEOPLE_DRAWER_TOGGLED, this.isPeopleDrawerVisible);
      },
      [cons.actions.navigation.OPEN_INVITE_LIST]: () => {
        this.emit(cons.events.navigation.INVITE_LIST_OPENED);
      },
      [cons.actions.navigation.OPEN_PUBLIC_ROOMS]: () => {
        this.emit(cons.events.navigation.PUBLIC_ROOMS_OPENED, action.searchTerm);
      },
      [cons.actions.navigation.OPEN_CREATE_ROOM]: () => {
        this.emit(cons.events.navigation.CREATE_ROOM_OPENED);
      },
      [cons.actions.navigation.OPEN_INVITE_USER]: () => {
        this.emit(cons.events.navigation.INVITE_USER_OPENED, action.roomId, action.searchTerm);
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
          action.eventId,
        );
      },
    };
    actions[action.type]?.();
  }
}

const navigation = new Navigation();
appDispatcher.register(navigation.navigate.bind(navigation));

export default navigation;
