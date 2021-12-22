import { openSearch, toggleRoomSettings } from '../action/navigation';
import navigation from '../state/navigation';

function listenKeyboard(event) {
  // Ctrl +
  if (event.ctrlKey) {
    // k - for search Modal
    if (event.keyCode === 75) {
      event.preventDefault();
      if (navigation.isRawModalVisible) return;
      openSearch();
    }
  }

  if (!event.ctrlKey && !event.altKey) {
    if (event.keyCode === 38 && navigation.isRoomSettings) {
      // close room settings
      toggleRoomSettings();
      return;
    }
    if (event.keyCode === 40 && !navigation.isRoomSettings) {
      // open room settings
      toggleRoomSettings();
      return;
    }

    if (navigation.isRawModalVisible) return;
    if (['text', 'textarea'].includes(document.activeElement.type)) {
      return;
    }
    if ((event.keyCode !== 8 && event.keyCode < 48)
      || (event.keyCode >= 91 && event.keyCode <= 93)
      || (event.keyCode >= 112 && event.keyCode <= 183)) {
      return;
    }
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
