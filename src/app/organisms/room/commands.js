import initMatrix from '../../../client/initMatrix';
import { toggleMarkdown } from '../../../client/action/settings';
import * as roomActions from '../../../client/action/room';
import { hasDMWith, hasDevices } from '../../../util/matrixUtil';
import { selectRoom } from '../../../client/action/navigation';

const MXID_REG = /^@\S+:\S+$/;
const ROOM_ID_ALIAS_REG = /^(#|!)\S+:\S+$/;
const ROOM_ID_REG = /^!\S+:\S+$/;
const MXC_REG = /^mxc:\/\/\S+$/;

const commands = {
  me: {
    name: 'me',
    description: 'Display action',
    exe: (roomId, data) => {
      const body = data.trim();
      if (body === '') return undefined;
      return body;
    },
  },
  shrug: {
    name: 'shrug',
    description: 'Send ¯\\_(ツ)_/¯ as message',
    exe: (roomId, data) => (
      `¯\\_(ツ)_/¯${data.trim() !== '' ? ` ${data}` : ''}`
    ),
  },
  markdown: {
    name: 'markdown',
    description: 'Toggle markdown for messages',
    exe: () => toggleMarkdown(),
  },
  startdm: {
    name: 'startdm',
    description: 'Start DM with user id. Example: /startdm @johndoe.matrix.org',
    exe: async (roomId, data) => {
      const mx = initMatrix.matrixClient;
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG) && id !== mx.getUserId());
      if (userIds.length === 0) return;
      if (userIds.length === 1) {
        const dmRoomId = hasDMWith(userIds[0]);
        if (dmRoomId) {
          selectRoom(dmRoomId);
          return;
        }
      }
      const devices = await Promise.all(userIds.map(hasDevices));
      const isEncrypt = devices.every((hasDevice) => hasDevice);
      const result = await roomActions.createDM(userIds, isEncrypt);
      selectRoom(result.room_id);
    },
  },
  join: {
    name: 'join',
    description: 'Join room with alias. Example: /join #cinny:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const roomIds = rawIds.filter((id) => id.match(ROOM_ID_ALIAS_REG));
      roomIds.map((id) => roomActions.join(id));
    },
  },
  leave: {
    name: 'leave',
    description: 'Leave room',
    exe: (roomId, data) => {
      if (data.trim() === '') {
        roomActions.leave(roomId);
        return;
      }
      const rawIds = data.split(' ');
      const roomIds = rawIds.filter((id) => id.match(ROOM_ID_REG));
      roomIds.map((id) => roomActions.leave(id));
    },
  },
  invite: {
    name: 'invite',
    description: 'Invite user to room. Example: /invite @johndoe:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      userIds.map((id) => roomActions.invite(roomId, id));
    },
  },
  disinvite: {
    name: 'disinvite',
    description: 'Disinvite user to room. Example: /disinvite @johndoe:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      userIds.map((id) => roomActions.kick(roomId, id));
    },
  },
  kick: {
    name: 'kick',
    description: 'Kick user from room. Example: /kick @johndoe:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      userIds.map((id) => roomActions.kick(roomId, id));
    },
  },
  ban: {
    name: 'ban',
    description: 'Ban user from room. Example: /ban @johndoe:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      userIds.map((id) => roomActions.ban(roomId, id));
    },
  },
  unban: {
    name: 'unban',
    description: 'Unban user from room. Example: /unban @johndoe:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      userIds.map((id) => roomActions.unban(roomId, id));
    },
  },
  ignore: {
    name: 'ignore',
    description: 'Ignore user. Example: /ignore @johndoe:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      if (userIds.length > 0) roomActions.ignore(userIds);
    },
  },
  unignore: {
    name: 'unignore',
    description: 'Unignore user. Example: /unignore @johndoe:matrix.org',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      if (userIds.length > 0) roomActions.unignore(userIds);
    },
  },
  myroomnick: {
    name: 'myroomnick',
    description: 'Change my room nick',
    exe: (roomId, data) => {
      const nick = data.trim();
      if (nick === '') return;
      roomActions.setMyRoomNick(roomId, nick);
    },
  },
  myroomavatar: {
    name: 'myroomavatar',
    description: 'Change my room avatar. Example /myroomavatar mxc://xyzabc',
    exe: (roomId, data) => {
      if (data.match(MXC_REG)) {
        roomActions.setMyRoomAvatar(roomId, data);
      }
    },
  },
  converttodm: {
    name: 'converttodm',
    description: 'Convert room to direct message',
    exe: (roomId) => {
      roomActions.convertToDm(roomId);
    },
  },
  converttoroom: {
    name: 'converttoroom',
    description: 'Convert direct message to room',
    exe: (roomId) => {
      roomActions.convertToRoom(roomId);
    },
  },
};

export default commands;
