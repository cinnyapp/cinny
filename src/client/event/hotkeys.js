import { openSearch } from '../action/navigation';
import navigation from '../state/navigation';

function listenKeyboard(event) {
  // Ctrl/Cmd +
  if (event.ctrlKey || event.metaKey) {
    // open search modal
    if (event.key === 'k') {
      event.preventDefault();
      if (navigation.isRawModalVisible) return;
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
