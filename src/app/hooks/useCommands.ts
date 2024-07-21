import { MatrixClient, Room } from 'matrix-js-sdk';
import { useMemo } from 'react';
import { getDMRoomFor, isRoomAlias, isRoomId, isUserId } from '../utils/matrix';
import { hasDevices } from '../../util/matrixUtil';
import * as roomActions from '../../client/action/room';
import { useRoomNavigate } from './useRoomNavigate';

export const SHRUG = '¯\\_(ツ)_/¯';

export function parseUsersAndReason(payload: string): {
  users: string[];
  reason?: string;
} {
  let reason: string | undefined;
  let ids: string = payload;

  const reasonMatch = payload.match(/\s-r\s/);
  if (reasonMatch) {
    ids = payload.slice(0, reasonMatch.index);
    reason = payload.slice((reasonMatch.index ?? 0) + reasonMatch[0].length);
    if (reason.trim() === '') reason = undefined;
  }
  const rawIds = ids.split(' ');
  const users = rawIds.filter((id) => isUserId(id));
  return {
    users,
    reason,
  };
}

export type CommandExe = (payload: string) => Promise<void>;

export enum Command {
  Me = 'me',
  Notice = 'notice',
  Shrug = 'shrug',
  StartDm = 'startdm',
  Join = 'join',
  Leave = 'leave',
  Invite = 'invite',
  DisInvite = 'disinvite',
  Kick = 'kick',
  Ban = 'ban',
  UnBan = 'unban',
  Ignore = 'ignore',
  UnIgnore = 'unignore',
  MyRoomNick = 'myroomnick',
  MyRoomAvatar = 'myroomavatar',
  ConvertToDm = 'converttodm',
  ConvertToRoom = 'converttoroom',
}

export type CommandContent = {
  name: string;
  description: string;
  exe: CommandExe;
};

export type CommandRecord = Record<Command, CommandContent>;

export const useCommands = (mx: MatrixClient, room: Room): CommandRecord => {
  const { navigateRoom } = useRoomNavigate();

  const commands: CommandRecord = useMemo(
    () => ({
      [Command.Me]: {
        name: Command.Me,
        description: 'Send action message',
        exe: async () => undefined,
      },
      [Command.Notice]: {
        name: Command.Notice,
        description: 'Send notice message',
        exe: async () => undefined,
      },
      [Command.Shrug]: {
        name: Command.Shrug,
        description: 'Send ¯\\_(ツ)_/¯ as message',
        exe: async () => undefined,
      },
      [Command.StartDm]: {
        name: Command.StartDm,
        description: 'Start direct message with user. Example: /startdm userId1',
        exe: async (payload) => {
          const rawIds = payload.split(' ');
          const userIds = rawIds.filter((id) => isUserId(id) && id !== mx.getUserId());
          if (userIds.length === 0) return;
          if (userIds.length === 1) {
            const dmRoomId = getDMRoomFor(mx, userIds[0])?.roomId;
            if (dmRoomId) {
              navigateRoom(dmRoomId);
              return;
            }
          }
          const devices = await Promise.all(userIds.map(uid => hasDevices(mx, uid)));
          const isEncrypt = devices.every((hasDevice) => hasDevice);
          const result = await roomActions.createDM(mx, userIds, isEncrypt);
          navigateRoom(result.room_id);
        },
      },
      [Command.Join]: {
        name: Command.Join,
        description: 'Join room with address. Example: /join address1 address2',
        exe: async (payload) => {
          const rawIds = payload.split(' ');
          const roomIds = rawIds.filter(
            (idOrAlias) => isRoomId(idOrAlias) || isRoomAlias(idOrAlias)
          );
          roomIds.map((id) => roomActions.join(mx, id));
        },
      },
      [Command.Leave]: {
        name: Command.Leave,
        description: 'Leave current room.',
        exe: async (payload) => {
          if (payload.trim() === '') {
            mx.leave(room.roomId);
            return;
          }
          const rawIds = payload.split(' ');
          const roomIds = rawIds.filter((id) => isRoomId(id));
          roomIds.map((id) => mx.leave(id));
        },
      },
      [Command.Invite]: {
        name: Command.Invite,
        description: 'Invite user to room. Example: /invite userId1 userId2 [-r reason]',
        exe: async (payload) => {
          const { users, reason } = parseUsersAndReason(payload);
          users.map((id) => mx.invite(room.roomId, id, reason));
        },
      },
      [Command.DisInvite]: {
        name: Command.DisInvite,
        description: 'Disinvite user to room. Example: /disinvite userId1 userId2 [-r reason]',
        exe: async (payload) => {
          const { users, reason } = parseUsersAndReason(payload);
          users.map((id) => mx.kick(room.roomId, id, reason));
        },
      },
      [Command.Kick]: {
        name: Command.Kick,
        description: 'Kick user from room. Example: /kick userId1 userId2 [-r reason]',
        exe: async (payload) => {
          const { users, reason } = parseUsersAndReason(payload);
          users.map((id) => mx.kick(room.roomId, id, reason));
        },
      },
      [Command.Ban]: {
        name: Command.Ban,
        description: 'Ban user from room. Example: /ban userId1 userId2 [-r reason]',
        exe: async (payload) => {
          const { users, reason } = parseUsersAndReason(payload);
          users.map((id) => mx.ban(room.roomId, id, reason));
        },
      },
      [Command.UnBan]: {
        name: Command.UnBan,
        description: 'Unban user from room. Example: /unban userId1 userId2',
        exe: async (payload) => {
          const rawIds = payload.split(' ');
          const users = rawIds.filter((id) => isUserId(id));
          users.map((id) => mx.unban(room.roomId, id));
        },
      },
      [Command.Ignore]: {
        name: Command.Ignore,
        description: 'Ignore user. Example: /ignore userId1 userId2',
        exe: async (payload) => {
          const rawIds = payload.split(' ');
          const userIds = rawIds.filter((id) => isUserId(id));
          if (userIds.length > 0) roomActions.ignore(mx, userIds);
        },
      },
      [Command.UnIgnore]: {
        name: Command.UnIgnore,
        description: 'Unignore user. Example: /unignore userId1 userId2',
        exe: async (payload) => {
          const rawIds = payload.split(' ');
          const userIds = rawIds.filter((id) => isUserId(id));
          if (userIds.length > 0) roomActions.unignore(mx, userIds);
        },
      },
      [Command.MyRoomNick]: {
        name: Command.MyRoomNick,
        description: 'Change nick in current room.',
        exe: async (payload) => {
          const nick = payload.trim();
          if (nick === '') return;
          roomActions.setMyRoomNick(mx, room.roomId, nick);
        },
      },
      [Command.MyRoomAvatar]: {
        name: Command.MyRoomAvatar,
        description: 'Change profile picture in current room. Example /myroomavatar mxc://xyzabc',
        exe: async (payload) => {
          if (payload.match(/^mxc:\/\/\S+$/)) {
            roomActions.setMyRoomAvatar(mx, room.roomId, payload);
          }
        },
      },
      [Command.ConvertToDm]: {
        name: Command.ConvertToDm,
        description: 'Convert room to direct message',
        exe: async () => {
          roomActions.convertToDm(mx, room.roomId);
        },
      },
      [Command.ConvertToRoom]: {
        name: Command.ConvertToRoom,
        description: 'Convert direct message to room',
        exe: async () => {
          roomActions.convertToRoom(mx, room.roomId);
        },
      },
    }),
    [mx, room, navigateRoom]
  );

  return commands;
};
