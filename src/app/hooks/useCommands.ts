import {
  Direction,
  EventTimeline,
  IContextResponse,
  MatrixClient,
  Method,
  Preset,
  Room,
  RoomMember,
  Visibility,
} from 'matrix-js-sdk';
import { RoomServerAclEventContent } from 'matrix-js-sdk/lib/types';
import { useMemo } from 'react';
import {
  addRoomIdToMDirect,
  getDMRoomFor,
  guessDmRoomUserId,
  isRoomAlias,
  isRoomId,
  isServerName,
  isUserId,
  rateLimitedActions,
  removeRoomIdFromMDirect,
} from '../utils/matrix';
import { useRoomNavigate } from './useRoomNavigate';
import { Membership, StateEvent } from '../../types/matrix/room';
import { getStateEvent } from '../utils/room';
import { splitWithSpace } from '../utils/common';
import { createRoomEncryptionState } from '../components/create-room';

export const SHRUG = '¯\\_(ツ)_/¯';
export const TABLEFLIP = '(╯°□°)╯︵ ┻━┻';
export const UNFLIP = '┬─┬ノ( º_ºノ)';

const FLAG_PAT = '(?:^|\\s)-(\\w+)\\b';
const FLAG_REG = new RegExp(FLAG_PAT);
const FLAG_REG_G = new RegExp(FLAG_PAT, 'g');

export const splitPayloadContentAndFlags = (payload: string): [string, string | undefined] => {
  const flagMatch = payload.match(FLAG_REG);

  if (!flagMatch) {
    return [payload, undefined];
  }
  const content = payload.slice(0, flagMatch.index);
  const flags = payload.slice(flagMatch.index);

  return [content, flags];
};

export const parseFlags = (flags: string | undefined): Record<string, string | undefined> => {
  const result: Record<string, string> = {};
  if (!flags) return result;

  const matches: { key: string; index: number; match: string }[] = [];

  for (let match = FLAG_REG_G.exec(flags); match !== null; match = FLAG_REG_G.exec(flags)) {
    matches.push({ key: match[1], index: match.index, match: match[0] });
  }

  for (let i = 0; i < matches.length; i += 1) {
    const { key, match } = matches[i];
    const start = matches[i].index + match.length;
    const end = i + 1 < matches.length ? matches[i + 1].index : flags.length;
    const value = flags.slice(start, end).trim();
    result[key] = value;
  }

  return result;
};

export const parseUsers = (payload: string): string[] => {
  const users: string[] = [];

  splitWithSpace(payload).forEach((item) => {
    if (isUserId(item)) {
      users.push(item);
    }
  });

  return users;
};

export const parseServers = (payload: string): string[] => {
  const servers: string[] = [];

  splitWithSpace(payload).forEach((item) => {
    if (isServerName(item)) {
      servers.push(item);
    }
  });

  return servers;
};

const getServerMembers = (room: Room, server: string): RoomMember[] => {
  const members: RoomMember[] = room
    .getMembers()
    .filter((member) => member.userId.endsWith(`:${server}`));

  return members;
};

export const parseTimestampFlag = (input: string): number | undefined => {
  const match = input.match(/^(\d+(?:\.\d+)?)([dhms])$/); // supports floats like 1.5d

  if (!match) {
    return undefined;
  }

  const value = parseFloat(match[1]); // supports decimal values
  const unit = match[2];

  const now = Date.now(); // in milliseconds
  let delta = 0;

  switch (unit) {
    case 'd':
      delta = value * 24 * 60 * 60 * 1000;
      break;
    case 'h':
      delta = value * 60 * 60 * 1000;
      break;
    case 'm':
      delta = value * 60 * 1000;
      break;
    case 's':
      delta = value * 1000;
      break;
    default:
      return undefined;
  }

  const timestamp = now - delta;
  return timestamp;
};

export type CommandExe = (payload: string) => Promise<void>;

export enum Command {
  Me = 'me',
  Notice = 'notice',
  Rainbow = 'rainbow',
  RainbowMe = 'rainbowme',
  Html = 'html',
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
  TableFlip = 'tableflip',
  UnFlip = 'unflip',
  Delete = 'delete',
  Acl = 'acl',
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
      [Command.Rainbow]: {
        name: Command.Rainbow,
        description: 'Send rainbow message',
        exe: async () => undefined,
      },
      [Command.RainbowMe]: {
        name: Command.RainbowMe,
        description: 'Send rainbow action message',
        exe: async () => undefined,
      },
      [Command.Html]: {
        name: Command.Html,
        description: 'Send raw HTML message',
        exe: async () => undefined,
      },
      [Command.Shrug]: {
        name: Command.Shrug,
        description: 'Send ¯\\_(ツ)_/¯ as message',
        exe: async () => undefined,
      },
      [Command.TableFlip]: {
        name: Command.TableFlip,
        description: `Send ${TABLEFLIP} as message`,
        exe: async () => undefined,
      },
      [Command.UnFlip]: {
        name: Command.UnFlip,
        description: `Send ${UNFLIP} as message`,
        exe: async () => undefined,
      },
      [Command.StartDm]: {
        name: Command.StartDm,
        description: 'Start direct message with user. Example: /startdm userId1',
        exe: async (payload) => {
          const rawIds = splitWithSpace(payload);
          const userIds = rawIds.filter((id) => isUserId(id) && id !== mx.getSafeUserId());
          if (userIds.length === 0) return;
          if (userIds.length === 1) {
            const dmRoomId = getDMRoomFor(mx, userIds[0])?.roomId;
            if (dmRoomId) {
              navigateRoom(dmRoomId);
              return;
            }
          }
          const result = await mx.createRoom({
            is_direct: true,
            invite: userIds,
            visibility: Visibility.Private,
            preset: Preset.TrustedPrivateChat,
            initial_state: [createRoomEncryptionState()],
          });
          addRoomIdToMDirect(mx, result.room_id, userIds[0]);
          navigateRoom(result.room_id);
        },
      },
      [Command.Join]: {
        name: Command.Join,
        description: 'Join room with address. Example: /join address1 address2',
        exe: async (payload) => {
          const rawIds = splitWithSpace(payload);
          const roomIdOrAliases = rawIds.filter(
            (idOrAlias) => isRoomId(idOrAlias) || isRoomAlias(idOrAlias)
          );
          roomIdOrAliases.forEach(async (idOrAlias) => {
            await mx.joinRoom(idOrAlias);
          });
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
          const rawIds = splitWithSpace(payload);
          const roomIds = rawIds.filter((id) => isRoomId(id));
          roomIds.map((id) => mx.leave(id));
        },
      },
      [Command.Invite]: {
        name: Command.Invite,
        description: 'Invite user to room. Example: /invite userId1 userId2 [-r reason]',
        exe: async (payload) => {
          const [content, flags] = splitPayloadContentAndFlags(payload);
          const users = parseUsers(content);
          const flagToContent = parseFlags(flags);
          const reason = flagToContent.r;
          users.map((id) => mx.invite(room.roomId, id, reason));
        },
      },
      [Command.DisInvite]: {
        name: Command.DisInvite,
        description: 'Disinvite user to room. Example: /disinvite userId1 userId2 [-r reason]',
        exe: async (payload) => {
          const [content, flags] = splitPayloadContentAndFlags(payload);
          const users = parseUsers(content);
          const flagToContent = parseFlags(flags);
          const reason = flagToContent.r;
          users.map((id) => mx.kick(room.roomId, id, reason));
        },
      },
      [Command.Kick]: {
        name: Command.Kick,
        description: 'Kick user from room. Example: /kick userId1 userId2 servername [-r reason]',
        exe: async (payload) => {
          const [content, flags] = splitPayloadContentAndFlags(payload);
          const users = parseUsers(content);
          const servers = parseServers(content);
          const flagToContent = parseFlags(flags);
          const reason = flagToContent.r;

          const serverMembers = servers?.flatMap((server) => getServerMembers(room, server));
          const serverUsers = serverMembers
            ?.filter((m) => m.membership !== Membership.Ban)
            .map((m) => m.userId);

          if (Array.isArray(serverUsers)) {
            serverUsers.forEach((user) => {
              if (!users.includes(user)) users.push(user);
            });
          }

          rateLimitedActions(users, (id) => mx.kick(room.roomId, id, reason));
        },
      },
      [Command.Ban]: {
        name: Command.Ban,
        description: 'Ban user from room. Example: /ban userId1 userId2 servername [-r reason]',
        exe: async (payload) => {
          const [content, flags] = splitPayloadContentAndFlags(payload);
          const users = parseUsers(content);
          const servers = parseServers(content);
          const flagToContent = parseFlags(flags);
          const reason = flagToContent.r;

          const serverMembers = servers?.flatMap((server) => getServerMembers(room, server));
          const serverUsers = serverMembers?.map((m) => m.userId);

          if (Array.isArray(serverUsers)) {
            serverUsers.forEach((user) => {
              if (!users.includes(user)) users.push(user);
            });
          }

          rateLimitedActions(users, (id) => mx.ban(room.roomId, id, reason));
        },
      },
      [Command.UnBan]: {
        name: Command.UnBan,
        description: 'Unban user from room. Example: /unban userId1 userId2',
        exe: async (payload) => {
          const rawIds = splitWithSpace(payload);
          const users = rawIds.filter((id) => isUserId(id));
          users.map((id) => mx.unban(room.roomId, id));
        },
      },
      [Command.Ignore]: {
        name: Command.Ignore,
        description: 'Ignore user. Example: /ignore userId1 userId2',
        exe: async (payload) => {
          const rawIds = splitWithSpace(payload);
          const userIds = rawIds.filter((id) => isUserId(id));
          if (userIds.length > 0) {
            let ignoredUsers = mx.getIgnoredUsers().concat(userIds);
            ignoredUsers = [...new Set(ignoredUsers)];
            await mx.setIgnoredUsers(ignoredUsers);
          }
        },
      },
      [Command.UnIgnore]: {
        name: Command.UnIgnore,
        description: 'Unignore user. Example: /unignore userId1 userId2',
        exe: async (payload) => {
          const rawIds = splitWithSpace(payload);
          const userIds = rawIds.filter((id) => isUserId(id));
          if (userIds.length > 0) {
            const ignoredUsers = mx.getIgnoredUsers();
            await mx.setIgnoredUsers(ignoredUsers.filter((id) => !userIds.includes(id)));
          }
        },
      },
      [Command.MyRoomNick]: {
        name: Command.MyRoomNick,
        description: 'Change nick in current room.',
        exe: async (payload) => {
          const nick = payload.trim();
          if (nick === '') return;
          const mEvent = room
            .getLiveTimeline()
            .getState(EventTimeline.FORWARDS)
            ?.getStateEvents(StateEvent.RoomMember, mx.getSafeUserId());
          const content = mEvent?.getContent();
          if (!content) return;
          await mx.sendStateEvent(
            room.roomId,
            StateEvent.RoomMember as any,
            {
              ...content,
              displayname: nick,
            },
            mx.getSafeUserId()
          );
        },
      },
      [Command.MyRoomAvatar]: {
        name: Command.MyRoomAvatar,
        description: 'Change profile picture in current room. Example /myroomavatar mxc://xyzabc',
        exe: async (payload) => {
          if (payload.match(/^mxc:\/\/\S+$/)) {
            const mEvent = room
              .getLiveTimeline()
              .getState(EventTimeline.FORWARDS)
              ?.getStateEvents(StateEvent.RoomMember, mx.getSafeUserId());
            const content = mEvent?.getContent();
            if (!content) return;
            await mx.sendStateEvent(
              room.roomId,
              StateEvent.RoomMember as any,
              {
                ...content,
                avatar_url: payload,
              },
              mx.getSafeUserId()
            );
          }
        },
      },
      [Command.ConvertToDm]: {
        name: Command.ConvertToDm,
        description: 'Convert room to direct message',
        exe: async () => {
          const dmUserId = guessDmRoomUserId(room, mx.getSafeUserId());
          await addRoomIdToMDirect(mx, room.roomId, dmUserId);
        },
      },
      [Command.ConvertToRoom]: {
        name: Command.ConvertToRoom,
        description: 'Convert direct message to room',
        exe: async () => {
          await removeRoomIdFromMDirect(mx, room.roomId);
        },
      },
      [Command.Delete]: {
        name: Command.Delete,
        description:
          'Delete messages from users. Example: /delete userId1 servername -past 1d|2h|5m|30s [-t m.room.message] [-r spam]',
        exe: async (payload) => {
          const [content, flags] = splitPayloadContentAndFlags(payload);
          const users = parseUsers(content);
          const servers = parseServers(content);

          const flagToContent = parseFlags(flags);
          const reason = flagToContent.r;
          const pastContent = flagToContent.past ?? '';
          const msgTypeContent = flagToContent.t;
          const messageTypes: string[] = msgTypeContent ? splitWithSpace(msgTypeContent) : [];

          const ts = parseTimestampFlag(pastContent);
          if (!ts) return;

          const serverMembers = servers?.flatMap((server) => getServerMembers(room, server));
          const serverUsers = serverMembers?.map((m) => m.userId);

          if (Array.isArray(serverUsers)) {
            serverUsers.forEach((user) => {
              if (!users.includes(user)) users.push(user);
            });
          }

          const result = await mx.timestampToEvent(room.roomId, ts, Direction.Forward);
          const startEventId = result.event_id;

          const path = `/rooms/${encodeURIComponent(room.roomId)}/context/${encodeURIComponent(
            startEventId
          )}`;
          const eventContext = await mx.http.authedRequest<IContextResponse>(Method.Get, path, {
            limit: 0,
          });

          let token: string | undefined = eventContext.start;
          while (token) {
            // eslint-disable-next-line no-await-in-loop
            const response = await mx.createMessagesRequest(
              room.roomId,
              token,
              20,
              Direction.Forward,
              undefined
            );
            const { end, chunk } = response;
            // remove until the latest event;
            token = end;

            const eventsToDelete = chunk.filter(
              (roomEvent) =>
                (messageTypes.length > 0 ? messageTypes.includes(roomEvent.type) : true) &&
                users.includes(roomEvent.sender) &&
                roomEvent.unsigned?.redacted_because === undefined
            );

            const eventIds = eventsToDelete.map((roomEvent) => roomEvent.event_id);

            // eslint-disable-next-line no-await-in-loop
            await rateLimitedActions(eventIds, (eventId) =>
              mx.redactEvent(room.roomId, eventId, undefined, { reason })
            );
          }
        },
      },
      [Command.Acl]: {
        name: Command.Acl,
        description:
          'Manage server access control list. Example /acl [-a servername1] [-d servername2] [-ra servername1] [-rd servername2]',
        exe: async (payload) => {
          const [, flags] = splitPayloadContentAndFlags(payload);

          const flagToContent = parseFlags(flags);
          const allowFlag = flagToContent.a;
          const denyFlag = flagToContent.d;
          const removeAllowFlag = flagToContent.ra;
          const removeDenyFlag = flagToContent.rd;

          const allowList = allowFlag ? splitWithSpace(allowFlag) : [];
          const denyList = denyFlag ? splitWithSpace(denyFlag) : [];
          const removeAllowList = removeAllowFlag ? splitWithSpace(removeAllowFlag) : [];
          const removeDenyList = removeDenyFlag ? splitWithSpace(removeDenyFlag) : [];

          const serverAcl = getStateEvent(
            room,
            StateEvent.RoomServerAcl
          )?.getContent<RoomServerAclEventContent>();

          const aclContent: RoomServerAclEventContent = {
            allow: serverAcl?.allow ? [...serverAcl.allow] : [],
            allow_ip_literals: serverAcl?.allow_ip_literals,
            deny: serverAcl?.deny ? [...serverAcl.deny] : [],
          };

          allowList.forEach((servername) => {
            if (!Array.isArray(aclContent.allow) || aclContent.allow.includes(servername)) return;
            aclContent.allow.push(servername);
          });
          denyList.forEach((servername) => {
            if (!Array.isArray(aclContent.deny) || aclContent.deny.includes(servername)) return;
            aclContent.deny.push(servername);
          });

          aclContent.allow = aclContent.allow?.filter(
            (servername) => !removeAllowList.includes(servername)
          );
          aclContent.deny = aclContent.deny?.filter(
            (servername) => !removeDenyList.includes(servername)
          );

          aclContent.allow?.sort();
          aclContent.deny?.sort();

          await mx.sendStateEvent(room.roomId, StateEvent.RoomServerAcl as any, aclContent);
        },
      },
    }),
    [mx, room, navigateRoom]
  );

  return commands;
};
