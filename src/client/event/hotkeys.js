import { openSearch, toggleRoomSettings } from '../action/navigation';
import navigation from '../state/navigation';
import { markAsRead } from '../action/notifications';

function listenKeyboard(event) {
  // Ctrl/Cmd +
  if (event.ctrlKey || event.metaKey) {
    // k - for search Modal
    if (event.keyCode === 75) {
      event.preventDefault();
      if (navigation.isRawModalVisible) return;
      openSearch();
    }
  }

  if (!event.ctrlKey && !event.altKey) {
    if (navigation.isRawModalVisible) return;
    if (['text', 'textarea'].includes(document.activeElement.type)) {
      return;
    }

    // esc
    if (event.keyCode === 27) {
      if (navigation.isRoomSettings) {
        toggleRoomSettings();
        return;
      }
      if (navigation.selectedRoomId) {
        markAsRead(navigation.selectedRoomId);
        return;
      }
    }

    // Don't allow these keys to type/focus message field
    if ((event.keyCode !== 8 && event.keyCode < 48)
      || (event.keyCode >= 91 && event.keyCode <= 93)
      || (event.keyCode >= 112 && event.keyCode <= 183)) {
      return;
    }

    // press any key to focus and type in message field
    const msgTextarea = document.getElementById('message-textarea');
    msgTextarea?.focus();
  }
}

function initHotkeys() {
  document.body.addEventListener('keydown', listenKeyboard);
}

function removeHotkeys() {
  document.body.removeEventListener('keydown', listenKeyboard);
}

export { initHotkeys, removeHotkeys };
