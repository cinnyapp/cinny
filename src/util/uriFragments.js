import {
  selectRoom, selectSpace, openJoinAlias,
} from '../client/action/navigation';

import navigation from '../client/state/navigation';
import cons from '../client/state/cons';

const listeners = [];

export function handleUriFragmentChange() {
  if (!window.location.hash.startsWith('/#')) return;

  // Room must be selected AFTER client finished loading
  const pieces = window.location.hash.split('/');
  // a[0] always is #
  // if no trailing '/' would be used for hash we would have to remove it
  // relevant array items start at index 1

  if (pieces[1] === 'join') {
    openJoinAlias(pieces[2]);
    return;
  }

  // /<room|home|spaceid>...
  if (pieces.length >= 2) {
    if (pieces[1] === 'room' || pieces[1][0] !== '!') pieces[1] = cons.tabs.HOME;

    selectSpace(pieces[1]);
  }

  // /<room|spaceid>/<roomid?>/<eventid?>
  if (pieces.length >= 3) {
    if (pieces[2][0] !== '!') selectRoom(null);
    else if (pieces[3] && pieces[3][0] === '$') selectRoom(pieces[2], pieces[3]);
    else selectRoom(pieces[2]);
  }
}

listeners.push(
  window.addEventListener('hashchange', handleUriFragmentChange),

  navigation.on(cons.events.navigation.ROOM_SELECTED, (selectedRoom, _previousRoom, eventId) => {
    const pieces = window.location.hash.split('/');
    if (!eventId) pieces.length = 3;
    else pieces[3] = eventId;
    if (!selectRoom) pieces.length = 2;
    else pieces[2] = selectedRoom;
    if (pieces[1] === 'join') pieces[1] = cons.tabs.HOME;
    window.location.hash = pieces.join('/');
  }),

  navigation.on(cons.events.navigation.SPACE_SELECTED, (spaceSelected) => {
    const pieces = window.location.hash.split('/');
    pieces[1] = spaceSelected ?? 'room';
    window.location.hash = pieces.join('/');
  }),

  navigation.on(cons.actions.navigation.OPEN_NAVIGATION, () => {
    const pieces = window.location.hash.split('/');
    pieces.length = 2;
    window.location.hash = pieces.join('/');
  }),
);

export function destructUrlHandling() {
  listeners.forEach((l) => navigation.removeListener(l));
}
