import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

class Navigation extends EventEmitter {
  constructor() {
    super();

    this.activeTab = 'home';
    this.activeRoomId = null;
    this.isPeopleDrawerVisible = true;
  }

  getActiveTab() {
    return this.activeTab;
  }

  getActiveRoomId() {
    return this.activeRoomId;
  }

  navigate(action) {
    const actions = {
      [cons.actions.navigation.CHANGE_TAB]: () => {
        this.activeTab = action.tabId;
        this.emit(cons.events.navigation.TAB_CHANGED, this.activeTab);
      },
      [cons.actions.navigation.SELECT_ROOM]: () => {
        const prevActiveRoomId = this.activeRoomId;
        this.activeRoomId = action.roomId;
        this.emit(cons.events.navigation.ROOM_SELECTED, this.activeRoomId, prevActiveRoomId);
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
