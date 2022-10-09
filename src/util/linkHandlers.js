import { invoke } from '@tauri-apps/api/tauri';
import handleMatrix from './linkHandlers/matrix.to';

const handlers = {
  'matrix.to': (url) => handleMatrix(url),
};

export default function handleLink(e) {
  const url = new URL(e.target.href);
  const handler = handlers[url.hostname];

  if (handler) {
    handler(url);
    e.preventDefault();
    return;
  }

  // if running inside tauri, let the backend handle the opening of the url
  // useful so we can open urls in the user's browser specified app or a specified app
  if (window.__TAURI__) {
    e.preventDefault();
    invoke('open_link', { url: e.target.href, bypassHandlers: false });
  } else {
    window.open(e.target.href);
    e.preventDefault();
  }
}
