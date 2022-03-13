import appDispatcher from '../dispatcher';
import cons from '../state/cons';

/**
 * @param {string | string[]} roomId - room id or array of them to add into shortcuts
 */
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

export function moveSpaceShortcut(roomId, toIndex) {
  appDispatcher.dispatch({
    type: cons.actions.accountData.MOVE_SPACE_SHORTCUTS,
    roomId,
    toIndex,
  });
}

export function categorizeSpace(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.accountData.CATEGORIZE_SPACE,
    roomId,
  });
}

export function unCategorizeSpace(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.accountData.UNCATEGORIZE_SPACE,
    roomId,
  });
}
