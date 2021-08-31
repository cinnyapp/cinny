import appDispatcher from '../dispatcher';
import cons from '../state/cons';

function changeTab(tabId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.CHANGE_TAB,
    tabId,
  });
}

function selectRoom(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.SELECT_ROOM,
    roomId,
  });
}

function togglePeopleDrawer() {
  appDispatcher.dispatch({
    type: cons.actions.navigation.TOGGLE_PEOPLE_DRAWER,
  });
}

function openInviteList() {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_INVITE_LIST,
  });
}

function openPublicRooms(searchTerm) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_PUBLIC_ROOMS,
    searchTerm,
  });
}

function openCreateRoom() {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_CREATE_ROOM,
  });
}

function openInviteUser(roomId, searchTerm) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_INVITE_USER,
    roomId,
    searchTerm,
  });
}

function openSettings() {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_SETTINGS,
  });
}

function openEmojiBoard(cords, requestEmojiCallback) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_EMOJIBOARD,
    cords,
    requestEmojiCallback,
  });
}

function openReadReceipts(roomId, eventId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_READRECEIPTS,
    roomId,
    eventId,
  });
}

export {
  changeTab,
  selectRoom,
  togglePeopleDrawer,
  openInviteList,
  openPublicRooms,
  openCreateRoom,
  openInviteUser,
  openSettings,
  openEmojiBoard,
  openReadReceipts,
};
