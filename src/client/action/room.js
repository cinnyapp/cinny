import initMatrix from '../initMatrix';
import appDispatcher from '../dispatcher';
import cons from '../state/cons';

/**
 * https://github.com/matrix-org/matrix-react-sdk/blob/1e6c6e9d800890c732d60429449bc280de01a647/src/Rooms.js#L73
 * @param {string} roomId Id of room to add
 * @param {string} userId User id to which dm
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

/**
 *
 * @param {string} roomId
 * @param {boolean} isDM
 */
async function join(roomIdOrAlias, isDM) {
  const mx = initMatrix.matrixClient;
  const roomIdParts = roomIdOrAlias.split(':');
  try {
    const resultRoom = await mx.joinRoom(roomIdOrAlias, { viaServers: [roomIdParts[1]] });

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
function leave(roomId) {
  const mx = initMatrix.matrixClient;
  const isDM = initMatrix.roomList.directs.has(roomId);
  mx.leave(roomId)
    .then(() => {
      appDispatcher.dispatch({
        type: cons.actions.room.LEAVE,
        roomId,
        isDM,
      });
    }).catch();
}

/**
 * Create a room.
 * @param {Object} opts
 * @param {string} [opts.name]
 * @param {string} [opts.topic]
 * @param {boolean} [opts.isPublic=false] Sets room visibility to public
 * @param {string} [opts.roomAlias] Sets the room address
 * @param {boolean} [opts.isEncrypted=false] Makes room encrypted
 * @param {boolean} [opts.isDirect=false] Makes room as direct message
 * @param {string[]} [opts.invite=[]] An array of userId's to invite
 * @param{number} [opts.powerLevel=100] My power level
 */
async function create(opts) {
  const mx = initMatrix.matrixClient;
  const customPowerLevels = [101];
  const options = {
    name: opts.name,
    topic: opts.topic,
    visibility: opts.isPublic === true ? 'public' : 'private',
    room_alias_name: opts.roomAlias,
    is_direct: opts.isDirect === true,
    invite: opts.invite || [],
    initial_state: [],
    preset: opts.isDirect === true ? 'trusted_private_chat' : undefined,
    power_level_content_override: customPowerLevels.indexOf(opts.powerLevel) === -1 ? undefined : {
      users: { [initMatrix.matrixClient.getUserId()]: opts.powerLevel },
    },
  };

  if (opts.isPublic !== true && opts.isEncrypted === true) {
    options.initial_state.push({
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: 'm.megolm.v1.aes-sha2',
      },
    });
  }

  try {
    const result = await mx.createRoom(options);
    if (opts.isDirect === true && typeof opts.invite[0] !== 'undefined') {
      await addRoomToMDirect(result.room_id, opts.invite[0]);
    }
    appDispatcher.dispatch({
      type: cons.actions.room.CREATE,
      roomId: result.room_id,
      isDM: opts.isDirect === true,
    });
    return result;
  } catch (e) {
    const errcodes = ['M_UNKNOWN', 'M_BAD_JSON', 'M_ROOM_IN_USE', 'M_INVALID_ROOM_STATE', 'M_UNSUPPORTED_ROOM_VERSION'];
    if (errcodes.find((errcode) => errcode === e.errcode)) {
      appDispatcher.dispatch({
        type: cons.actions.room.error.CREATE,
        error: e,
      });
      throw new Error(e);
    }
    throw new Error('Something went wrong!');
  }
}

async function invite(roomId, userId) {
  const mx = initMatrix.matrixClient;

  const result = await mx.invite(roomId, userId);
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

async function setPowerLevel(roomId, userId, powerLevel) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  const powerlevelEvent = room.currentState.getStateEvents('m.room.power_levels')[0];

  const result = await mx.setPowerLevel(roomId, userId, powerLevel, powerlevelEvent);
  return result;
}

function createSpaceShortcut(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.room.CREATE_SPACE_SHORTCUT,
    roomId,
  });
}

function deleteSpaceShortcut(roomId) {
  appDispatcher.dispatch({
    type: cons.actions.room.DELETE_SPACE_SHORTCUT,
    roomId,
  });
}

export {
  join, leave,
  create, invite, kick, ban, unban,
  setPowerLevel,
  createSpaceShortcut, deleteSpaceShortcut,
};
