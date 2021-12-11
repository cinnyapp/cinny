import { openSearch } from '../action/navigation';
import navigation from '../state/navigation';

function listenKeyboard(event) {
  // Ctrl +
  if (event.ctrlKey) {
    // k - for search Modal
    if (event.keyCode === 75) {
      if (navigation.isRawModalVisible) return;
      event.preventDefault();
      openSearch();
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
