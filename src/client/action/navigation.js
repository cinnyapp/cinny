import appDispatcher from '../dispatcher';
import cons from '../state/cons';

export function openSpaceSettings(roomId, tabText) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_SPACE_SETTINGS,
    roomId,
    tabText,
  });
}

export function openSpaceAddExisting(roomId, spaces = false) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_SPACE_ADDEXISTING,
    roomId,
    spaces,
  });
}

export function toggleRoomSettings(roomId, tabText) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.TOGGLE_ROOM_SETTINGS,
    roomId,
    tabText
  });
}


export function openCreateRoom(isSpace = false, parentId = null) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_CREATE_ROOM,
    isSpace,
    parentId,
  });
}

export function openJoinAlias(term) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_JOIN_ALIAS,
    term,
  });
}

export function openInviteUser(roomId, searchTerm) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_INVITE_USER,
    roomId,
    searchTerm,
  });
}

export function openProfileViewer(userId, roomId) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_PROFILE_VIEWER,
    userId,
    roomId,
  });
}

export function openSettings(tabText) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_SETTINGS,
    tabText,
  });
}

export function openSearch(term) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_SEARCH,
    term,
  });
}

export function openReusableContextMenu(placement, cords, render, afterClose) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_REUSABLE_CONTEXT_MENU,
    placement,
    cords,
    render,
    afterClose,
  });
}

export function openReusableDialog(title, render, afterClose) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_REUSABLE_DIALOG,
    title,
    render,
    afterClose,
  });
}

export function openEmojiVerification(request, targetDevice) {
  appDispatcher.dispatch({
    type: cons.actions.navigation.OPEN_EMOJI_VERIFICATION,
    request,
    targetDevice,
  });
}
