import HashIC from '../../public/res/ic/outlined/hash.svg';
import HashGlobeIC from '../../public/res/ic/outlined/hash-globe.svg';
import HashLockIC from '../../public/res/ic/outlined/hash-lock.svg';
import SpaceIC from '../../public/res/ic/outlined/space.svg';
import SpaceGlobeIC from '../../public/res/ic/outlined/space-globe.svg';
import SpaceLockIC from '../../public/res/ic/outlined/space-lock.svg';

const WELL_KNOWN_URI = '/.well-known/matrix/client';

export async function getBaseUrl(servername) {
  let protocol = 'https://';
  if (servername.match(/^https?:\/\//) !== null) protocol = '';
  const serverDiscoveryUrl = `${protocol}${servername}${WELL_KNOWN_URI}`;
  try {
    const result = await (await fetch(serverDiscoveryUrl, { method: 'GET' })).json();

    const baseUrl = result?.['m.homeserver']?.base_url;
    if (baseUrl === undefined) throw new Error();
    return baseUrl;
  } catch (e) {
    return `${protocol}${servername}`;
  }
}

export function getUsername(mx, userId) {
  const user = mx.getUser(userId);
  if (user === null) return userId;
  let username = user.displayName;
  if (typeof username === 'undefined') {
    username = userId;
  }
  return username;
}

export function getUsernameOfRoomMember(roomMember) {
  return roomMember.name || roomMember.userId;
}

export async function isRoomAliasAvailable(mx, alias) {
  try {
    const result = await mx.getRoomIdForAlias(alias);
    if (result.room_id) return false;
    return false;
  } catch (e) {
    if (e.errcode === 'M_NOT_FOUND') return true;
    return false;
  }
}

export function getPowerLabel(powerLevel) {
  if (powerLevel > 9000) return 'Goku';
  if (powerLevel > 100) return 'Founder';
  if (powerLevel === 100) return 'Admin';
  if (powerLevel >= 50) return 'Mod';
  return null;
}

export function parseReply(rawBody) {
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

export function trimHTMLReply(html) {
  if (!html) return html;
  const suffix = '</mx-reply>';
  const i = html.indexOf(suffix);
  if (i < 0) {
    return html;
  }
  return html.slice(i + suffix.length);
}

export function joinRuleToIconSrc(joinRule, isSpace) {
  return ({
    restricted: () => (isSpace ? SpaceIC : HashIC),
    knock: () => (isSpace ? SpaceLockIC : HashLockIC),
    invite: () => (isSpace ? SpaceLockIC : HashLockIC),
    public: () => (isSpace ? SpaceGlobeIC : HashGlobeIC),
  }[joinRule]?.() || null);
}

export function getIdServer(userId) {
  const idParts = userId.split(':');
  return idParts[1];
}

export function isCrossVerified(mx, deviceId) {
  try {
    const crossSignInfo = mx.getStoredCrossSigningForUser(mx.getUserId());
    const deviceInfo = mx.getStoredDevice(mx.getUserId(), deviceId);
    const deviceTrust = crossSignInfo.checkDeviceTrust(crossSignInfo, deviceInfo, false, true);
    return deviceTrust.isCrossSigningVerified();
  } catch (e) {
    // device does not support encryption
    return null;
  }
}

export function hasCrossSigningAccountData(mx) {
  const masterKeyData = mx.getAccountData('m.cross_signing.master');
  return !!masterKeyData;
}

export function getDefaultSSKey(mx) {
  try {
    return mx.getAccountData('m.secret_storage.default_key').getContent().key;
  } catch {
    return undefined;
  }
}

export function getSSKeyInfo(mx, key) {
  try {
    return mx.getAccountData(`m.secret_storage.key.${key}`).getContent();
  } catch {
    return undefined;
  }
}

export async function hasDevices(mx, userId) {
  try {
    const usersDeviceMap = await mx.downloadKeys([userId, mx.getUserId()]);
    return Object.values(usersDeviceMap)
      .every((userDevices) => (Object.keys(userDevices).length > 0));
  } catch (e) {
    console.error("Error determining if it's possible to encrypt to all users: ", e);
    return false;
  }
}
