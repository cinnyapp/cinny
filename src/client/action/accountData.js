import appDispatcher from '../dispatcher';
import cons from '../state/cons';

export function createSpaceShortcut(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.accountData.CREATE_SPACE_SHORTCUT,
    roomId,
  });
}

export function deleteSpaceShortcut(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.accountData.DELETE_SPACE_SHORTCUT,
    roomId,
  });
}
