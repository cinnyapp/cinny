import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

class Navigation extends EventEmitter {
  constructor() {
    super();
    this.rawModelStack = [];
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
      [cons.actions.navigation.OPEN_SPACE_SETTINGS]: () => {
        this.emit(cons.events.navigation.SPACE_SETTINGS_OPENED, action.roomId, action.tabText);
      },
      [cons.actions.navigation.OPEN_SPACE_ADDEXISTING]: () => {
        this.emit(cons.events.navigation.SPACE_ADDEXISTING_OPENED, action.roomId, action.spaces);
      },
      [cons.actions.navigation.TOGGLE_ROOM_SETTINGS]: () => {
        this.emit(
          cons.events.navigation.ROOM_SETTINGS_TOGGLED,
          action.roomId,
          action.tabText
        );
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
