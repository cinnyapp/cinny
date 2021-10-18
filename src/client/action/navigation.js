import appDispatcher from '../dispatcher';
import cons from '../state/cons';

function selectTab(tabId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.SELECT_TAB,
    tabId,
  });
}

function selectSpace(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.SELECT_SPACE,
    roomId,
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

function openProfileViewer(userId, roomId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_PROFILE_VIEWER,
    userId,
    roomId,
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

function openRoomOptions(cords, roomId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_ROOMOPTIONS,
    cords,
    roomId,
  });
}

export {
  selectTab,
  selectSpace,
  selectRoom,
  togglePeopleDrawer,
  openInviteList,
  openPublicRooms,
  openCreateRoom,
  openInviteUser,
  openProfileViewer,
  openSettings,
  openEmojiBoard,
  openReadReceipts,
  openRoomOptions,
};
