import {
  selectRoom, selectSpace, openJoinAlias,
} from '../client/action/navigation';

import navigation from '../client/state/navigation';
import cons from '../client/state/cons';

async function joinRoom(roomAlias) {
  openJoinAlias(roomAlias);
}

const listeners = [];

export function handleUriFragmentChange() {
  if (window.location.hash === ''
      || window.location.hash === '#'
      || window.location.hash === '#/') return;

  // Room must be selected AFTER client finished loading
  const a = window.location.hash.split('/');
  // a[0] always is #
  // if no trailing '/' would be used for hash we would have to remove it
  // relevant array items start at index 1

  if (a[1] === 'join') {
    joinRoom(a[2]);
    return;
  }

  // /<room|home|spaceid>...
  if (a.length >= 2) {
    if (a[1] === 'room' || a[1][0] !== '!') a[1] = cons.tabs.HOME;

    selectSpace(a[1]);
  }

  // /<room|spaceid>/<roomid?>/<eventid?>
  if (a.length >= 3) {
    if (a[2][0] !== '!') selectRoom(null);
    else if (a[3] && a[3][0] === '$') selectRoom(a[2], a[3]);
    else selectRoom(a[2]);
  }
}

listeners.push(
  window.addEventListener('hashchange', handleUriFragmentChange),

  navigation.on(cons.events.navigation.ROOM_SELECTED, (selectedRoom, _previousRoom, eventId) => {
    const a = window.location.hash.split('/');
    if (!eventId) a.length = 3;
    else a[3] = eventId;
    if (!selectRoom) a.length = 2;
    else a[2] = selectedRoom;
    if (a[1] === 'join') a[1] = cons.tabs.HOME;
    window.location.hash = a.join('/');
  }),

  navigation.on(cons.events.navigation.SPACE_SELECTED, (spaceSelected) => {
    const strp = window.location.hash.split('/');
    strp[1] = spaceSelected ?? 'room';
    window.location.hash = strp.join('/');
  }),

  navigation.on(cons.actions.navigation.OPEN_NAVIGATION, () => {
    const h = window.location.hash.split('/');
    h.length = 2;
    window.location.hash = h.join('/');
  }),
);

export function destructUrlHandling() {
  listeners.forEach((l) => navigation.removeListener(l));
}
