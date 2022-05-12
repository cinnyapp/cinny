import { openSearch, toggleRoomSettings } from '../action/navigation';
import navigation from '../state/navigation';
import { markAsRead } from '../action/notifications';

// describes which keys should auto-focus the message field
function shouldFocusMessageField(code) {
  // should focus on alphanumeric values, and backspace
  if (code.startsWith('Key')) {
    return true;
  }
  if (code.startsWith('Digit')) {
    return true;
  }
  if (code === 'Backspace') {
    return true;
  }

  // do not focus if super key is pressed
  if (code.startsWith('Meta')) { // chrome
    return false;
  }
  if (code.startsWith('OS')) { // firefox
    return false;
  }

  // do not focus on F keys
  if (/^F\d+$/.test(code)) {
    return false;
  }

  // do not focus on numlock/scroll lock
  if (code === 'NumLock' || code === 'ScrollLock') {
    return false;
  }

  return true;
}

function listenKeyboard(event) {
  // Ctrl/Cmd +
  if (event.ctrlKey || event.metaKey) {
    // open search modal
    if (event.code === 'KeyK') {
      event.preventDefault();
      if (navigation.isRawModalVisible) {
        return;
      }
      openSearch();
    }

    // focus message field on paste
    if (event.code === 'KeyV') {
      const msgTextarea = document.getElementById('message-textarea');
      msgTextarea?.focus();
    }
  }

  if (!event.ctrlKey && !event.altKey && !event.metaKey) {
    if (navigation.isRawModalVisible) return;
    if (['text', 'textarea'].includes(document.activeElement.type)) {
      return;
    }

    if (event.code === 'Escape') {
      if (navigation.isRoomSettings) {
        toggleRoomSettings();
        return;
      }
      if (navigation.selectedRoomId) {
        markAsRead(navigation.selectedRoomId);
        return;
      }
    }

    // focus the text field on most keypresses
    if (shouldFocusMessageField(event.code)) {
      // press any key to focus and type in message field
      const msgTextarea = document.getElementById('message-textarea');
      msgTextarea?.focus();
    }
  }
}

function initHotkeys() {
  document.body.addEventListener('keydown', listenKeyboard);
}

function removeHotkeys() {
  document.body.removeEventListener('keydown', listenKeyboard);
}

export { initHotkeys, removeHotkeys };
