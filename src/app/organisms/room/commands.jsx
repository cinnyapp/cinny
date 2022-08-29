import React from 'react';
import './commands.scss';

import initMatrix from '../../../client/initMatrix';
import * as roomActions from '../../../client/action/room';
import { hasDMWith, hasDevices } from '../../../util/matrixUtil';
import { selectRoom, openReusableDialog } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import SettingTile from '../../molecules/setting-tile/SettingTile';

const MXID_REG = /^@\S+:\S+$/;
const ROOM_ID_ALIAS_REG = /^(#|!)\S+:\S+$/;
const ROOM_ID_REG = /^!\S+:\S+$/;
const MXC_REG = /^mxc:\/\/\S+$/;

export function processMxidAndReason(data) {
  let reason;
  let idData = data;
  const reasonMatch = data.match(/\s-r\s/);
  if (reasonMatch) {
    idData = data.slice(0, reasonMatch.index);
    reason = data.slice(reasonMatch.index + reasonMatch[0].length);
    if (reason.trim() === '') reason = undefined;
  }
  const rawIds = idData.split(' ');
  const userIds = rawIds.filter((id) => id.match(MXID_REG));
  return {
    userIds,
    reason,
  };
}

const commands = {
  me: {
    name: 'me',
    description: 'Display action',
    exe: (roomId, data, onSuccess) => {
      const body = data.trim();
      if (body === '') return;
      onSuccess(body, 'm.emote');
    },
  },
  shrug: {
    name: 'shrug',
    description: 'Send ¯\\_(ツ)_/¯ as message',
    exe: (roomId, data, onSuccess) => onSuccess(
      `¯\\_(ツ)_/¯${data.trim() !== '' ? ` ${data}` : ''}`,
      'm.text',
    ),
  },
  help: {
    name: 'help',
    description: 'View all commands',
    // eslint-disable-next-line no-use-before-define
    exe: () => openHelpDialog(),
  },
  startdm: {
    name: 'startdm',
    description: 'Start DM with user. Example: /startdm userId1 userId2',
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
    description: 'Join room with alias. Example: /join alias1 alias2',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const roomIds = rawIds.filter((id) => id.match(ROOM_ID_ALIAS_REG));
      roomIds.map((id) => roomActions.join(id));
    },
  },
  leave: {
    name: 'leave',
    description: 'Leave current room.',
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
    description: 'Invite user to room. Example: /invite userId1 userId2 [-r reason]',
    exe: (roomId, data) => {
      const { userIds, reason } = processMxidAndReason(data);
      userIds.map((id) => roomActions.invite(roomId, id, reason));
    },
  },
  disinvite: {
    name: 'disinvite',
    description: 'Disinvite user to room. Example: /disinvite userId1 userId2 [-r reason]',
    exe: (roomId, data) => {
      const { userIds, reason } = processMxidAndReason(data);
      userIds.map((id) => roomActions.kick(roomId, id, reason));
    },
  },
  kick: {
    name: 'kick',
    description: 'Kick user from room. Example: /kick userId1 userId2 [-r reason]',
    exe: (roomId, data) => {
      const { userIds, reason } = processMxidAndReason(data);
      userIds.map((id) => roomActions.kick(roomId, id, reason));
    },
  },
  ban: {
    name: 'ban',
    description: 'Ban user from room. Example: /ban userId1 userId2 [-r reason]',
    exe: (roomId, data) => {
      const { userIds, reason } = processMxidAndReason(data);
      userIds.map((id) => roomActions.ban(roomId, id, reason));
    },
  },
  unban: {
    name: 'unban',
    description: 'Unban user from room. Example: /unban userId1 userId2',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      userIds.map((id) => roomActions.unban(roomId, id));
    },
  },
  ignore: {
    name: 'ignore',
    description: 'Ignore user. Example: /ignore userId1 userId2',
    exe: (roomId, data) => {
      const rawIds = data.split(' ');
      const userIds = rawIds.filter((id) => id.match(MXID_REG));
      if (userIds.length > 0) roomActions.ignore(userIds);
    },
  },
  unignore: {
    name: 'unignore',
    description: 'Unignore user. Example: /unignore userId1 userId2',
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

function openHelpDialog() {
  openReusableDialog(
    <Text variant="s1" weight="medium">Commands</Text>,
    () => (
      <div className="commands-dialog">
        {Object.keys(commands).map((cmdName) => (
          <SettingTile
            key={cmdName}
            title={cmdName}
            content={<Text variant="b3">{commands[cmdName].description}</Text>}
          />
        ))}
      </div>
    ),
  );
}

export default commands;
