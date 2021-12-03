import initMatrix from '../client/initMatrix';

const WELL_KNOWN_URI = '/.well-known/matrix/client';

async function getBaseUrl(servername) {
  let protocol = 'https://';
  if (servername.match(/^https?:\/\//) !== null) protocol = '';
  const serverDiscoveryUrl = `${protocol}${servername}${WELL_KNOWN_URI}`;
  try {
    const result = await (await fetch(serverDiscoveryUrl, { method: 'GET' })).json();

    const baseUrl = result?.['m.homeserver']?.base_url;
    if (baseUrl === undefined) throw new Error();
    return baseUrl;
  } catch (e) {
    throw new Error(`${protocol}${servername}`);
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

function getPowerLabel(powerLevel) {
  if (powerLevel > 9000) return 'Goku';
  if (powerLevel > 100) return 'Founder';
  if (powerLevel === 100) return 'Admin';
  if (powerLevel >= 50) return 'Mod';
  return null;
}

function parseReply(rawBody) {
  if (rawBody?.indexOf('>') !== 0) return null;
  let body = rawBody.slice(rawBody.indexOf('<') + 1);
  const user = body.slice(0, body.indexOf('>'));

  body = body.slice(body.indexOf('>') + 2);
  const replyBody = body.slice(0, body.indexOf('\n\n'));
  body = body.slice(body.indexOf('\n\n') + 2);

  if (user === '') return null;

  const isUserId = user.match(/^@.+:.+/);

  return {
    userId: isUserId ? user : null,
    displayName: isUserId ? null : user,
    replyBody,
    body,
  };
}

export {
  getBaseUrl, getUsername, getUsernameOfRoomMember,
  isRoomAliasAvailable, getPowerLabel, parseReply,
};
