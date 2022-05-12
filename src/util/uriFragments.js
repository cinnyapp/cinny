import {
    selectRoom, selectSpace,
  } from '../client/action/navigation';
  import matrixClient from '../client/initMatrix';
  
  import navigation from '../client/state/navigation';
  import cons from '../client/state/cons';
  
  async function joinRoom(roomAlias) {
    const room = await matrixClient.matrixClient.getRoomSummary(roomAlias);
    // TODO: Check if already joined, replace this confirm
    if (!confirm(`Do you want to join ${room.name} (${roomAlias})?`)) return;
    await matrixClient.matrixClient.joinRoom(roomAlias);
    const state = await matrixClient.matrixClient.roomState(room.room_id);
    const isSpace = state.find((e) => e.type === 'm.room.create').content.type === 'm.space';
    if (isSpace) selectSpace(room.room_id);
    else selectRoom(room.room_id);
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
  