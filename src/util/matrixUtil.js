import initMatrix from '../client/initMatrix';

const WELL_KNOWN_URI = '/.well-known/matrix/client';

async function getBaseUrl(homeserver) {
  const serverDiscoveryUrl = `https://${homeserver}${WELL_KNOWN_URI}`;
  try {
    const result = await fetch(serverDiscoveryUrl, { method: 'GET' });
    const data = await result.json();

    return data?.['m.homeserver']?.base_url;
  } catch (e) {
    throw new Error('Homeserver not found');
  }
}

function getUsername(userId) {
  const mx = initMatrix.matrixClient;
  const user = mx.getUser(userId);
  if (user === null) return userId;
  let username = user.displayName;
  if (typeof username === 'undefined') {
    username = userId;
  }
  return username;
}

function getUsernameOfRoomMember(roomMember) {
  return roomMember.name || roomMember.userId;
}

async function isRoomAliasAvailable(alias) {
  try {
    const myUserId = initMatrix.matrixClient.getUserId();
    const myServer = myUserId.slice(myUserId.indexOf(':') + 1);
    const result = await initMatrix.matrixClient.resolveRoomAlias(alias);
    const aliasIsRegisteredOnMyServer = typeof result.servers.find((server) => server === myServer) === 'string';

    if (aliasIsRegisteredOnMyServer) return false;
    return true;
  } catch (e) {
    if (e.errcode === 'M_NOT_FOUND') return true;
    if (e.errcode === 'M_INVALID_PARAM') throw new Error(e);
    return false;
  }
}

function doesRoomHaveUnread(room) {
  const userId = initMatrix.matrixClient.getUserId();
  const readUpToId = room.getEventReadUpTo(userId);

  if (room.timeline.length
    && room.timeline[room.timeline.length - 1].sender
    && room.timeline[room.timeline.length - 1].sender.userId === userId
    && room.timeline[room.timeline.length - 1].getType() !== 'm.room.member') {
    return false;
  }

  for (let i = room.timeline.length - 1; i >= 0; i -= 1) {
    const event = room.timeline[i];

    if (event.getId() === readUpToId) return false;
    return true;
  }
  return true;
}

export {
  getBaseUrl, getUsername, getUsernameOfRoomMember,
  isRoomAliasAvailable, doesRoomHaveUnread,
};
