import EventEmitter from 'events';
import appDispatcher from '../dispatcher';
import cons from './cons';

class AccountData extends EventEmitter {
  constructor(roomList) {
    super();

    this.matrixClient = roomList.matrixClient;
    this.roomList = roomList;
    this.spaces = roomList.spaces;

    this.spaceShortcut = new Set();
    this._populateSpaceShortcut();
    this._listenEvents();

    appDispatcher.register(this.accountActions.bind(this));
  }

  _getAccountData() {
    return this.matrixClient.getAccountData(cons.IN_CINNY_SPACES)?.getContent() || {};
  }

  _populateSpaceShortcut() {
    this.spaceShortcut.clear();
    const spacesContent = this._getAccountData();

    if (spacesContent?.shortcut === undefined) return;

    spacesContent.shortcut.forEach((shortcut) => {
      if (this.spaces.has(shortcut)) this.spaceShortcut.add(shortcut);
    });
    if (spacesContent.shortcut.length !== this.spaceShortcut.size) {
      // update shortcut list from account data if shortcut space doesn't exist.
      // TODO: we can wait for sync to complete or else we may end up removing valid space id
      this._updateSpaceShortcutData([...this.spaceShortcut]);
    }
  }

  _updateSpaceShortcutData(shortcutList) {
    const spaceContent = this._getAccountData();
    spaceContent.shortcut = shortcutList;
    this.matrixClient.setAccountData(cons.IN_CINNY_SPACES, spaceContent);
  }

  accountActions(action) {
    const actions = {
      [cons.actions.accountData.CREATE_SPACE_SHORTCUT]: () => {
        if (this.spaceShortcut.has(action.roomId)) return;
        this.spaceShortcut.add(action.roomId);
        this._updateSpaceShortcutData([...this.spaceShortcut]);
        this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED, action.roomId);
      },
      [cons.actions.accountData.DELETE_SPACE_SHORTCUT]: () => {
        if (!this.spaceShortcut.has(action.roomId)) return;
        this.spaceShortcut.delete(action.roomId);
        this._updateSpaceShortcutData([...this.spaceShortcut]);
        this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED, action.roomId);
      },
    };
    actions[action.type]?.();
  }

  _listenEvents() {
    this.matrixClient.on('accountData', (event) => {
      if (event.getType() !== cons.IN_CINNY_SPACES) return;
      this._populateSpaceShortcut();
      this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED);
    });

    this.roomList.on(cons.events.roomList.ROOM_LEAVED, (roomId) => {
      if (this.spaceShortcut.has(roomId)) {
        // if deleted space has shortcut remove it.
        this.spaceShortcut.delete(roomId);
        this._updateSpaceShortcutData([...this.spaceShortcut]);
        this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED, roomId);
      }
    });
  }
}

export default AccountData;
