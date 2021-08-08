import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

class Navigation extends EventEmitter {
  constructor() {
    super();

    this.activeTab = 'channels';
    this.selectedRoom = null;
    this.isPeopleDrawerVisible = true;
  }

  getActiveTab() {
    return this.activeTab;
  }

  getActiveRoom() {
    return this.selectedRoom;
  }

  navigate(action) {
    const actions = {
      [cons.actions.navigation.CHANGE_TAB]: () => {
        this.activeTab = action.tabId;
        this.emit(cons.events.navigation.TAB_CHANGED, this.activeTab);
      },
      [cons.actions.navigation.SELECT_ROOM]: () => {
        this.selectedRoom = action.roomId;
        this.emit(cons.events.navigation.ROOM_SELECTED, this.selectedRoom);
      },
      [cons.actions.navigation.TOGGLE_PEOPLE_DRAWER]: () => {
        this.isPeopleDrawerVisible = !this.isPeopleDrawerVisible;
        this.emit(cons.events.navigation.PEOPLE_DRAWER_TOGGLED, this.isPeopleDrawerVisible);
      },
      [cons.actions.navigation.OPEN_INVITE_LIST]: () => {
        this.emit(cons.events.navigation.INVITE_LIST_OPENED);
      },
      [cons.actions.navigation.OPEN_PUBLIC_CHANNELS]: () => {
        this.emit(cons.events.navigation.PUBLIC_CHANNELS_OPENED);
      },
      [cons.actions.navigation.OPEN_CREATE_CHANNEL]: () => {
        this.emit(cons.events.navigation.CREATE_CHANNEL_OPENED);
      },
      [cons.actions.navigation.OPEN_INVITE_USER]: () => {
        this.emit(cons.events.navigation.INVITE_USER_OPENED, action.roomId, action.searchTerm);
      },
      [cons.actions.navigation.OPEN_SETTINGS]: () => {
        this.emit(cons.events.navigation.SETTINGS_OPENED);
      },
    };
    actions[action.type]?.();
  }
}

const navigation = new Navigation();
appDispatcher.register(navigation.navigate.bind(navigation));

export default navigation;
