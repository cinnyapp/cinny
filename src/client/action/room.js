import initMatrix from '../initMatrix';
import appDispatcher from '../dispatcher';
import cons from '../state/cons';
import { getIdServer } from '../../util/matrixUtil';

/**
 * https://github.com/matrix-org/matrix-react-sdk/blob/1e6c6e9d800890c732d60429449bc280de01a647/src/Rooms.js#L73
 * @param {string} roomId Id of room to add
 * @param {string} userId User id to which dm || undefined to remove
 * @returns {Promise} A promise
 */
function addRoomToMDirect(roomId, userId) {
  const mx = initMatrix.matrixClient;
  const mDirectsEvent = mx.getAccountData('m.direct');
  let userIdToRoomIds = {};

  if (typeof mDirectsEvent !== 'undefined') userIdToRoomIds = mDirectsEvent.getContent();

  // remove it from the lists of any others users
  // (it can only be a DM room for one person)
  Object.keys(userIdToRoomIds).forEach((thisUserId) => {
    const roomIds = userIdToRoomIds[thisUserId];

    if (thisUserId !== userId) {
      const indexOfRoomId = roomIds.indexOf(roomId);
      if (indexOfRoomId > -1) {
        roomIds.splice(indexOfRoomId, 1);
      }
    }
  });

  // now add it, if it's not already there
  if (userId) {
    const roomIds = userIdToRoomIds[userId] || [];
    if (roomIds.indexOf(roomId) === -1) {
      roomIds.push(roomId);
    }
    userIdToRoomIds[userId] = roomIds;
  }

  return mx.setAccountData('m.direct', userIdToRoomIds);
}

/**
 * Given a room, estimate which of its members is likely to
 * be the target if the room were a DM room and return that user.
 * https://github.com/matrix-org/matrix-react-sdk/blob/1e6c6e9d800890c732d60429449bc280de01a647/src/Rooms.js#L117
 *
 * @param {Object} room Target room
 * @param {string} myUserId User ID of the current user
 * @returns {string} User ID of the user that the room is probably a DM with
 */
function guessDMRoomTargetId(room, myUserId) {
  let oldestMemberTs;
  let oldestMember;

  // Pick the joined user who's been here longest (and isn't us),
  room.getJoinedMembers().forEach((member) => {
    if (member.userId === myUserId) return;

    if (typeof oldestMemberTs === 'undefined' || (member.events.member && member.events.member.getTs() < oldestMemberTs)) {
      oldestMember = member;
      oldestMemberTs = member.events.member.getTs();
    }
  });
  if (oldestMember) return oldestMember.userId;

  // if there are no joined members other than us, use the oldest member
  room.currentState.getMembers().forEach((member) => {
    if (member.userId === myUserId) return;

    if (typeof oldestMemberTs === 'undefined' || (member.events.member && member.events.member.getTs() < oldestMemberTs)) {
      oldestMember = member;
      oldestMemberTs = member.events.member.getTs();
    }
  });

  if (typeof oldestMember === 'undefined') return myUserId;
  return oldestMember.userId;
}

function convertToDm(roomId) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  return addRoomToMDirect(roomId, guessDMRoomTargetId(room, mx.getUserId()));
}

function convertToRoom(roomId) {
  return addRoomToMDirect(roomId, undefined);
}

/**
 *
 * @param {string} roomId
 * @param {boolean} isDM
 * @param {string[]} via
 */
async function join(roomIdOrAlias, isDM = false, via = undefined) {
  const mx = initMatrix.matrixClient;
  const roomIdParts = roomIdOrAlias.split(':');
  const viaServers = via || [roomIdParts[1]];

  try {
    const resultRoom = await mx.joinRoom(roomIdOrAlias, { viaServers });

    if (isDM) {
      const targetUserId = guessDMRoomTargetId(mx.getRoom(resultRoom.roomId), mx.getUserId());
      await addRoomToMDirect(resultRoom.roomId, targetUserId);
    }
    appDispatcher.dispatch({
      type: cons.actions.room.JOIN,
      roomId: resultRoom.roomId,
      isDM,
    });
    return resultRoom.roomId;
  } catch (e) {
    throw new Error(e);
  }
}

/**
 *
 * @param {string} roomId
 * @param {boolean} isDM
 */
async function leave(roomId) {
  const mx = initMatrix.matrixClient;
  const isDM = initMatrix.roomList.directs.has(roomId);
  try {
    await mx.leave(roomId);
    appDispatcher.dispatch({
      type: cons.actions.room.LEAVE,
      roomId,
      isDM,
    });
  } catch {
    console.error('Unable to leave room.');
  }
}

async function create(options, isDM = false) {
  const mx = initMatrix.matrixClient;
  try {
    const result = await mx.createRoom(options);
    if (isDM && typeof options.invite?.[0] === 'string') {
      await addRoomToMDirect(result.room_id, options.invite[0]);
    }
    appDispatcher.dispatch({
      type: cons.actions.room.CREATE,
      roomId: result.room_id,
      isDM,
    });
    return result;
  } catch (e) {
    const errcodes = ['M_UNKNOWN', 'M_BAD_JSON', 'M_ROOM_IN_USE', 'M_INVALID_ROOM_STATE', 'M_UNSUPPORTED_ROOM_VERSION'];
    if (errcodes.includes(e.errcode)) {
      throw new Error(e);
    }
    throw new Error('Something went wrong!');
  }
}

async function createDM(userIdOrIds, isEncrypted = true) {
  const options = {
    is_direct: true,
    invite: Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds],
    visibility: 'private',
    preset: 'trusted_private_chat',
    initial_state: [],
  };
  if (isEncrypted) {
    options.initial_state.push({
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: 'm.megolm.v1.aes-sha2',
      },
    });
  }

  const result = await create(options, true);
  return result;
}

async function createRoom(opts) {
  // joinRule: 'public' | 'invite' | 'restricted'
  const { name, topic, joinRule } = opts;
  const alias = opts.alias ?? undefined;
  const parentId = opts.parentId ?? undefined;
  const isSpace = opts.isSpace ?? false;
  const isEncrypted = opts.isEncrypted ?? false;
  const powerLevel = opts.powerLevel ?? undefined;
  const blockFederation = opts.blockFederation ?? false;

  const mx = initMatrix.matrixClient;
  const visibility = joinRule === 'public' ? 'public' : 'private';
  const options = {
    creation_content: undefined,
    name,
    topic,
    visibility,
    room_alias_name: alias,
    initial_state: [],
    power_level_content_override: undefined,
  };
  if (isSpace) {
    options.creation_content = { type: 'm.space' };
  }
  if (blockFederation) {
    options.creation_content = { 'm.federate': false };
  }
  if (isEncrypted) {
    options.initial_state.push({
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: 'm.megolm.v1.aes-sha2',
      },
    });
  }
  if (powerLevel) {
    options.power_level_content_override = {
      users: {
        [mx.getUserId()]: powerLevel,
      },
    };
  }
  if (parentId) {
    options.initial_state.push({
      type: 'm.space.parent',
      state_key: parentId,
      content: {
        canonical: true,
        via: [getIdServer(mx.getUserId())],
      },
    });
  }
  if (parentId && joinRule === 'restricted') {
    try {
      const caps = await mx.getCapabilities();
      options.room_version = caps
        ?.['m.room_versions']
        ?.['org.matrix.msc3244.room_capabilities']
        ?.restricted
        ?.preferred
        || undefined;
    } catch {
      console.error('Can\'t find room version for restricted.');
    }
    options.initial_state.push({
      type: 'm.room.join_rules',
      content: {
        join_rule: 'restricted',
        allow: [{
          type: 'm.room_membership',
          room_id: parentId,
        }],
      },
    });
  }

  const result = await create(options);

  if (parentId) {
    await mx.sendStateEvent(parentId, 'm.space.child', {
      auto_join: false,
      suggested: false,
      via: [getIdServer(mx.getUserId())],
    }, result.room_id);
  }

  return result;
}

async function invite(roomId, userId, reason) {
  const mx = initMatrix.matrixClient;

  const result = await mx.invite(roomId, userId, undefined, reason);
  return result;
}

async function kick(roomId, userId, reason) {
  const mx = initMatrix.matrixClient;

  const result = await mx.kick(roomId, userId, reason);
  return result;
}

async function ban(roomId, userId, reason) {
  const mx = initMatrix.matrixClient;

  const result = await mx.ban(roomId, userId, reason);
  return result;
}

async function unban(roomId, userId) {
  const mx = initMatrix.matrixClient;

  const result = await mx.unban(roomId, userId);
  return result;
}

async function ignore(userIds) {
  const mx = initMatrix.matrixClient;

  let ignoredUsers = mx.getIgnoredUsers().concat(userIds);
  ignoredUsers = [...new Set(ignoredUsers)];
  await mx.setIgnoredUsers(ignoredUsers);
}

async function unignore(userIds) {
  const mx = initMatrix.matrixClient;

  const ignoredUsers = mx.getIgnoredUsers();
  await mx.setIgnoredUsers(ignoredUsers.filter((id) => !userIds.includes(id)));
}

async function setPowerLevel(roomId, userId, powerLevel) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  const powerlevelEvent = room.currentState.getStateEvents('m.room.power_levels')[0];

  const result = await mx.setPowerLevel(roomId, userId, powerLevel, powerlevelEvent);
  return result;
}

async function setMyRoomNick(roomId, nick) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const mEvent = room.currentState.getStateEvents('m.room.member', mx.getUserId());
  const content = mEvent?.getContent();
  if (!content) return;
  await mx.sendStateEvent(roomId, 'm.room.member', {
    ...content,
    displayname: nick,
  }, mx.getUserId());
}

async function setMyRoomAvatar(roomId, mxc) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const mEvent = room.currentState.getStateEvents('m.room.member', mx.getUserId());
  const content = mEvent?.getContent();
  if (!content) return;
  await mx.sendStateEvent(roomId, 'm.room.member', {
    ...content,
    avatar_url: mxc,
  }, mx.getUserId());
}

export {
  convertToDm,
  convertToRoom,
  join, leave,
  createDM, createRoom,
  invite, kick, ban, unban,
  ignore, unignore,
  setPowerLevel,
  setMyRoomNick, setMyRoomAvatar,
};
