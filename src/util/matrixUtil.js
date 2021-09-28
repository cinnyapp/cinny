import initMatrix from '../client/initMatrix';

const WELL_KNOWN_URI = '/_matrix/client/versions';

async function getBaseUrl(homeserver) {
  let serverDiscoveryUrl = homeserver;
  if(!serverDiscoveryUrl.startsWith('http')){
    serverDiscoveryUrl = `https://${serverDiscoveryUrl}`;
  }

  try {
    const result = await fetch(`${serverDiscoveryUrl}${WELL_KNOWN_URI}`, { method: 'GET' });
    return serverDiscoveryUrl;
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
  const supportEvents = ['m.room.message', 'm.room.encrypted', 'm.sticker'];

  if (room.timeline.length
    && room.timeline[room.timeline.length - 1].sender
    && room.timeline[room.timeline.length - 1].sender.userId === userId
    && room.timeline[room.timeline.length - 1].getType() !== 'm.room.member') {
    return false;
  }

  for (let i = room.timeline.length - 1; i >= 0; i -= 1) {
    const event = room.timeline[i];

    if (event.getId() === readUpToId) return false;

    if (supportEvents.includes(event.getType())) {
      return true;
    }
  }
  return true;
}

export {
  getBaseUrl, getUsername, getUsernameOfRoomMember,
  isRoomAliasAvailable, doesRoomHaveUnread,
};
