import { EventTimeline } from 'matrix-js-sdk';
import { getIdServer } from '../../util/matrixUtil';

/**
 * https://github.com/matrix-org/matrix-react-sdk/blob/1e6c6e9d800890c732d60429449bc280de01a647/src/Rooms.js#L73
 * @param {MatrixClient} mx Matrix client
 * @param {string} roomId Id of room to add
 * @param {string} userId User id to which dm || undefined to remove
 * @returns {Promise} A promise
 */
function addRoomToMDirect(mx, roomId, userId) {
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
  room.getLiveTimeline().getState(EventTimeline.FORWARDS)?.getMembers().forEach((member) => {
    if (member.userId === myUserId) return;

    if (typeof oldestMemberTs === 'undefined' || (member.events.member && member.events.member.getTs() < oldestMemberTs)) {
      oldestMember = member;
      oldestMemberTs = member.events.member.getTs();
    }
  });

  if (typeof oldestMember === 'undefined') return myUserId;
  return oldestMember.userId;
}

function convertToDm(mx, roomId) {
  const room = mx.getRoom(roomId);
  return addRoomToMDirect(mx, roomId, guessDMRoomTargetId(room, mx.getUserId()));
}

function convertToRoom(mx, roomId) {
  return addRoomToMDirect(mx, roomId, undefined);
}

/**
 * @param {MatrixClient} mx
 * @param {string} roomId
 * @param {boolean} isDM
 * @param {string[]} via
 */
async function join(mx, roomIdOrAlias, isDM = false, via = undefined) {
  const roomIdParts = roomIdOrAlias.split(':');
  const viaServers = via || [roomIdParts[1]];

  try {
    const resultRoom = await mx.joinRoom(roomIdOrAlias, { viaServers });

    if (isDM) {
      const targetUserId = guessDMRoomTargetId(mx.getRoom(resultRoom.roomId), mx.getUserId());
      await addRoomToMDirect(mx, resultRoom.roomId, targetUserId);
    }
    return resultRoom.roomId;
  } catch (e) {
    throw new Error(e);
  }
}

async function create(mx, options, isDM = false) {
  try {
    const result = await mx.createRoom(options);
    if (isDM && typeof options.invite?.[0] === 'string') {
      await addRoomToMDirect(mx, result.room_id, options.invite[0]);
    }
    return result;
  } catch (e) {
    const errcodes = ['M_UNKNOWN', 'M_BAD_JSON', 'M_ROOM_IN_USE', 'M_INVALID_ROOM_STATE', 'M_UNSUPPORTED_ROOM_VERSION'];
    if (errcodes.includes(e.errcode)) {
      throw new Error(e);
    }
    throw new Error('Something went wrong!');
  }
}

async function createDM(mx, userIdOrIds, isEncrypted = true) {
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

  const result = await create(mx, options, true);
  return result;
}

async function createRoom(mx, opts) {
  // joinRule: 'public' | 'invite' | 'restricted'
  const { name, topic, joinRule } = opts;
  const alias = opts.alias ?? undefined;
  const parentId = opts.parentId ?? undefined;
  const isSpace = opts.isSpace ?? false;
  const isEncrypted = opts.isEncrypted ?? false;
  const powerLevel = opts.powerLevel ?? undefined;
  const blockFederation = opts.blockFederation ?? false;

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
    const caps = await mx.getCapabilities();
    if (caps['m.room_versions'].available?.['9'] !== 'stable') {
      throw new Error("ERROR: The server doesn't support restricted rooms");
    }
    if (Number(caps['m.room_versions'].default) < 9) {
      options.room_version = '9';
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

  const result = await create(mx, options);

  if (parentId) {
    await mx.sendStateEvent(parentId, 'm.space.child', {
      auto_join: false,
      suggested: false,
      via: [getIdServer(mx.getUserId())],
    }, result.room_id);
  }

  return result;
}

async function ignore(mx, userIds) {

  let ignoredUsers = mx.getIgnoredUsers().concat(userIds);
  ignoredUsers = [...new Set(ignoredUsers)];
  await mx.setIgnoredUsers(ignoredUsers);
}

async function unignore(mx, userIds) {
  const ignoredUsers = mx.getIgnoredUsers();
  await mx.setIgnoredUsers(ignoredUsers.filter((id) => !userIds.includes(id)));
}

async function setPowerLevel(mx, roomId, userId, powerLevel) {
  const result = await mx.setPowerLevel(roomId, userId, powerLevel);
  return result;
}

async function setMyRoomNick(mx, roomId, nick) {
  const room = mx.getRoom(roomId);
  const mEvent = room.getLiveTimeline().getState(EventTimeline.FORWARDS).getStateEvents('m.room.member', mx.getUserId());
  const content = mEvent?.getContent();
  if (!content) return;
  await mx.sendStateEvent(roomId, 'm.room.member', {
    ...content,
    displayname: nick,
  }, mx.getUserId());
}

async function setMyRoomAvatar(mx, roomId, mxc) {
  const room = mx.getRoom(roomId);
  const mEvent = room.getLiveTimeline().getState(EventTimeline.FORWARDS).getStateEvents('m.room.member', mx.getUserId());
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
  join,
  createDM, createRoom,
  ignore, unignore,
  setPowerLevel,
  setMyRoomNick, setMyRoomAvatar,
};
