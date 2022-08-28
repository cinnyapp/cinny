import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { openReusableDialog } from '../client/action/navigation';
import Text from '../app/atoms/text/Text';
import RoomTile from '../app/molecules/room-tile/RoomTile'; 
import initMatrix from '../client/initMatrix';
import PopupWindow from '../app/molecules/popup-window/PopupWindow';
import Spinner from '../app/atoms/spinner/Spinner';
import { openJoinAlias } from '../client/action/navigation';

const handlers = {
  'matrix.to': (url) => { 
    openJoinAlias(url.hash.slice(2));
  },
};

export default function handleLink(e) {
  const url = new URL(e.target.href);
  const handler = handlers[url.hostname];

  if (handler) {
    handler(url);
    e.preventDefault();
    return;
  }

  // if running inside tauri, check if the tauri backend has a custom handler for this link
  // useful so we can open urls in a specified app
  if (window.__TAURI__) {
    invoke('open_link', { url: e.target.href })
      .then(() => e.preventDefault())
      .catch((error) => console.error(error));
  }
  else {
    //open in new tab
    window.open(e.target.href);
    e.preventDefault();
  }
}
