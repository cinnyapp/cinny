import appDispatcher from '../dispatcher';
import cons from '../state/cons';

function handleTabChange(tabId) {
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

function openPublicChannels(searchTerm) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_PUBLIC_CHANNELS,
    searchTerm,
  });
}

function openCreateChannel() {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_CREATE_CHANNEL,
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

export {
  handleTabChange,
  selectRoom,
  togglePeopleDrawer,
  openInviteList,
  openPublicChannels,
  openCreateChannel,
  openInviteUser,
  openSettings,
  openEmojiBoard,
};
