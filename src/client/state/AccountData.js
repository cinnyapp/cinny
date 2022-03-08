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

    this.categorizedSpaces = new Set();
    this._populateCategorizedSpaces();

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

  _populateCategorizedSpaces() {
    this.categorizedSpaces.clear();
    const spaceContent = this._getAccountData();

    if (spaceContent?.categorized === undefined) return;

    spaceContent.categorized.forEach((spaceId) => {
      if (this.spaces.has(spaceId)) this.categorizedSpaces.add(spaceId);
    });
    if (spaceContent.categorized.length !== this.categorizedSpaces.size) {
      // TODO: we can wait for sync to complete or else we may end up removing valid space id
      this._updateCategorizedSpacesData([...this.categorizedSpaces]);
    }
  }

  _updateCategorizedSpacesData(categorizedSpaceList) {
    const spaceContent = this._getAccountData();
    spaceContent.categorized = categorizedSpaceList;
    this.matrixClient.setAccountData(cons.IN_CINNY_SPACES, spaceContent);
  }

  accountActions(action) {
    const actions = {
      [cons.actions.accountData.CREATE_SPACE_SHORTCUT]: () => {
        const addRoomId = (id) => {
          if (this.spaceShortcut.has(id)) return;
          this.spaceShortcut.add(id);
        };
        if (Array.isArray(action.roomId)) {
          action.roomId.forEach(addRoomId);
        } else {
          addRoomId(action.roomId);
        }
        this._updateSpaceShortcutData([...this.spaceShortcut]);
        this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED, action.roomId);
      },
      [cons.actions.accountData.DELETE_SPACE_SHORTCUT]: () => {
        if (!this.spaceShortcut.has(action.roomId)) return;
        this.spaceShortcut.delete(action.roomId);
        this._updateSpaceShortcutData([...this.spaceShortcut]);
        this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED, action.roomId);
      },
      [cons.actions.accountData.MOVE_SPACE_SHORTCUTS]: () => {
        const { roomId, toIndex } = action;
        if (!this.spaceShortcut.has(roomId)) return;
        this.spaceShortcut.delete(roomId);
        const ssList = [...this.spaceShortcut];
        if (toIndex >= ssList.length) ssList.push(roomId);
        else ssList.splice(toIndex, 0, roomId);
        this.spaceShortcut = new Set(ssList);
        this._updateSpaceShortcutData(ssList);
        this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED, roomId);
      },
      [cons.actions.accountData.CATEGORIZE_SPACE]: () => {
        if (this.categorizedSpaces.has(action.roomId)) return;
        this.categorizedSpaces.add(action.roomId);
        this._updateCategorizedSpacesData([...this.categorizedSpaces]);
        this.emit(cons.events.accountData.CATEGORIZE_SPACE_UPDATED, action.roomId);
      },
      [cons.actions.accountData.UNCATEGORIZE_SPACE]: () => {
        if (!this.categorizedSpaces.has(action.roomId)) return;
        this.categorizedSpaces.delete(action.roomId);
        this._updateCategorizedSpacesData([...this.categorizedSpaces]);
        this.emit(cons.events.accountData.CATEGORIZE_SPACE_UPDATED, action.roomId);
      },
    };
    actions[action.type]?.();
  }

  _listenEvents() {
    this.matrixClient.on('accountData', (event) => {
      if (event.getType() !== cons.IN_CINNY_SPACES) return;
      this._populateSpaceShortcut();
      this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED);
      this._populateCategorizedSpaces();
      this.emit(cons.events.accountData.CATEGORIZE_SPACE_UPDATED);
    });

    this.roomList.on(cons.events.roomList.ROOM_LEAVED, (roomId) => {
      if (this.spaceShortcut.has(roomId)) {
        // if deleted space has shortcut remove it.
        this.spaceShortcut.delete(roomId);
        this._updateSpaceShortcutData([...this.spaceShortcut]);
        this.emit(cons.events.accountData.SPACE_SHORTCUT_UPDATED, roomId);
      }
      if (this.categorizedSpaces.has(roomId)) {
        this.categorizedSpaces.delete(roomId);
        this._updateCategorizedSpacesData([...this.categorizedSpaces]);
        this.emit(cons.events.accountData.CATEGORIZE_SPACE_UPDATED, roomId);
      }
    });
  }
}

export default AccountData;
