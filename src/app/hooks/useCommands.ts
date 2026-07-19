import { useMemo } from 'react';
import { postCreateRoom, PostCreateRoomOK } from 'neurone/lib/api/matrix/client/v3/createRoom';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { postJoin } from 'neurone/lib/api/matrix/client/v3/join';
import {
  getContext,
  GetContextOK,
  getMessages,
  GetMessagesOK,
  postBan,
  postInvite,
  postKick,
  postLeave,
  postUnban,
  putRedact,
  putStateEvent,
} from 'neurone/lib/api/matrix/client/v3/rooms';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { getTimestampToEvent, GetTimestampToEventOK } from 'neurone/lib/api/matrix/client/v1/rooms';
import {
  addRoomIdToMDirect,
  getUserDirectRooms,
  guessDmRoomUserId,
  isRoomAlias,
  isRoomId,
  isServerName,
  isUserId,
  rateLimitedActions,
  removeRoomIdFromMDirect,
} from '../utils/matrix';
import { useRoomNavigate } from './useRoomNavigate';
import { RoomServerAclContent, StateEventType } from '../../types/matrix/room';
import { splitWithSpace } from '../utils/common';
import { createRoomEncryptionState } from '../components/create-room';
import { useClient } from './useClient';
import { useRoom } from './useRoom';
import { useRoomMembersAPI } from './useRoomMembers';
import {
  getJoinRoomMemberId,
  getJoinRoomStateId,
  JoinRoomMemberObject,
} from '../../client/storage/collections';
import { AccountDataType } from '../../types/matrix/accountData';
import { getIgnoredUsersContent, parseIgnoreUsersContent } from './useIgnoredUsers';

export const SHRUG = '¯\\_(ツ)_/¯';
export const TABLEFLIP = '(╯°□°)╯︵ ┻━┻';
export const UNFLIP = '┬─┬ノ( º_ºノ)';

const FLAG_PAT = '(?:^|\\s)-(\\w+)\\b';
const FLAG_REG = new RegExp(FLAG_PAT);
const FLAG_REG_G = new RegExp(FLAG_PAT, 'g');

const splitPayloadContentAndFlags = (payload: string): [string, string | undefined] => {
  const flagMatch = payload.match(FLAG_REG);

  if (!flagMatch) {
    return [payload, undefined];
  }
  const content = payload.slice(0, flagMatch.index);
  const flags = payload.slice(flagMatch.index);

  return [content, flags];
};

const parseFlags = (flags: string | undefined): Record<string, string | undefined> => {
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

const parseUsers = (payload: string): string[] => {
  const users: string[] = [];

  splitWithSpace(payload).forEach((item) => {
    if (isUserId(item)) {
      users.push(item);
    }
  });

  return users;
};

const parseServers = (payload: string): string[] => {
  const servers: string[] = [];

  splitWithSpace(payload).forEach((item) => {
    if (isServerName(item)) {
      servers.push(item);
    }
  });

  return servers;
};

const getServerMembers = (
  members: JoinRoomMemberObject[],
  server: string
): JoinRoomMemberObject[] => members.filter((member) => member.userId.endsWith(`:${server}`));

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

export const useCommands = (): CommandRecord => {
  const ct = useClient();
  const roomId = useRoom();
  const membersAPI = useRoomMembersAPI();
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
          const userIds = rawIds.filter((id) => isUserId(id) && id !== ct.session.userId);
          if (userIds.length === 0) return;
          if (userIds.length === 1) {
            const dmRoomId = getUserDirectRooms(ct, userIds[0])[0];
            if (dmRoomId) {
              navigateRoom(dmRoomId);
              return;
            }
          }
          const response = await ct.requestAuthJSON(
            postCreateRoom({
              body: {
                is_direct: true,
                invite: userIds,
                visibility: 'private',
                preset: 'trusted_private_chat',
                initial_state: [createRoomEncryptionState()],
              },
            })
          );
          const [err, result] = await parseMatrixResp<PostCreateRoomOK>(response);
          if (err) {
            console.error(printMatrixError(err));
            return;
          }

          addRoomIdToMDirect(ct, result.room_id, userIds[0]);
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
          roomIdOrAliases.forEach(async (roomIdOrAlias) => {
            await ct.requestAuthJSON(postJoin({ pathParams: { roomIdOrAlias } }));
          });
        },
      },
      [Command.Leave]: {
        name: Command.Leave,
        description: 'Leave current room.',
        exe: async (payload) => {
          if (payload.trim() === '') {
            ct.requestAuthJSON(postLeave({ pathParams: { roomId } }));
            return;
          }
          const rawIds = splitWithSpace(payload);
          const roomIds = rawIds.filter((id) => isRoomId(id));
          roomIds.map((id) => ct.requestAuthJSON(postLeave({ pathParams: { roomId: id } })));
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
          users.map((id) =>
            ct.requestAuthJSON(
              postInvite({
                pathParams: { roomId },
                body: { user_id: id, reason },
              })
            )
          );
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
          users.map((id) =>
            ct.requestAuthJSON(
              postKick({
                pathParams: { roomId },
                body: { user_id: id, reason },
              })
            )
          );
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

          const serverMembers = servers?.flatMap((server) =>
            getServerMembers(membersAPI.memberEventsResult.value ?? [], server)
          );
          const serverUsers = serverMembers
            ?.filter((m) => membersAPI.getMembership(m.userId) !== 'ban')
            .map((m) => m.userId);

          if (Array.isArray(serverUsers)) {
            serverUsers.forEach((user) => {
              if (!users.includes(user)) users.push(user);
            });
          }

          rateLimitedActions(users, async (id) => {
            const response = await ct.requestAuthJSON(
              postKick({
                pathParams: { roomId },
                body: { user_id: id, reason },
              })
            );
            const [err] = await parseMatrixResp(response);
            return err;
          });
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

          const serverMembers = servers?.flatMap((server) =>
            getServerMembers(membersAPI.memberEventsResult.value ?? [], server)
          );
          const serverUsers = serverMembers?.map((m) => m.userId);

          if (Array.isArray(serverUsers)) {
            serverUsers.forEach((user) => {
              if (!users.includes(user)) users.push(user);
            });
          }

          rateLimitedActions(users, async (id) => {
            const response = await ct.requestAuthJSON(
              postBan({
                pathParams: { roomId },
                body: { user_id: id, reason },
              })
            );
            const [err] = await parseMatrixResp(response);
            return err;
          });
        },
      },
      [Command.UnBan]: {
        name: Command.UnBan,
        description: 'Unban user from room. Example: /unban userId1 userId2',
        exe: async (payload) => {
          const rawIds = splitWithSpace(payload);
          const users = rawIds.filter((id) => isUserId(id));
          rateLimitedActions(users, async (id) => {
            const response = await ct.requestAuthJSON(
              postUnban({
                pathParams: { roomId },
                body: { user_id: id },
              })
            );
            const [err] = await parseMatrixResp(response);
            return err;
          });
        },
      },
      [Command.Ignore]: {
        name: Command.Ignore,
        description: 'Ignore user. Example: /ignore userId1 userId2',
        exe: async (payload) => {
          const rawIds = splitWithSpace(payload);
          const userIds = rawIds.filter((id) => isUserId(id));
          if (userIds.length > 0) {
            const ignoreUserListObj = await ct.storage.accountData.read.get(
              AccountDataType.IgnoredUserList
            );
            const { content } = ignoreUserListObj?.event ?? {};
            const ignoredUsers = parseIgnoreUsersContent(content).concat(userIds);
            await ct.requestAuthJSON(
              putAccountData({
                pathParams: { userId: ct.session.userId, type: AccountDataType.IgnoredUserList },
                body: getIgnoredUsersContent(ignoredUsers),
              })
            );
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
            const ignoreUserListObj = await ct.storage.accountData.read.get(
              AccountDataType.IgnoredUserList
            );
            const { content } = ignoreUserListObj?.event ?? {};
            const ignoredUsers = parseIgnoreUsersContent(content).filter(
              (id) => !userIds.includes(id)
            );
            await ct.requestAuthJSON(
              putAccountData({
                pathParams: { userId: ct.session.userId, type: AccountDataType.IgnoredUserList },
                body: getIgnoredUsersContent(ignoredUsers),
              })
            );
          }
        },
      },
      [Command.MyRoomNick]: {
        name: Command.MyRoomNick,
        description: 'Change nick in current room.',
        exe: async (payload) => {
          const nick = payload.trim();
          if (nick === '') return;
          const memberObj = await ct.storage.joinRoomMember.read.get(
            getJoinRoomMemberId(roomId, ct.session.userId)
          );
          const { content } = memberObj?.event ?? {};
          if (!content) return;

          ct.requestAuthJSON(
            putStateEvent({
              pathParams: {
                roomId,
                eventType: StateEventType.RoomMember,
                stateKey: ct.session.userId,
              },
              body: {
                ...content,
                displayname: nick,
              },
            })
          );
        },
      },
      [Command.MyRoomAvatar]: {
        name: Command.MyRoomAvatar,
        description: 'Change profile picture in current room. Example /myroomavatar mxc://xyzabc',
        exe: async (payload) => {
          if (payload.match(/^mxc:\/\/\S+$/)) {
            const memberObj = await ct.storage.joinRoomMember.read.get(
              getJoinRoomMemberId(roomId, ct.session.userId)
            );
            const { content } = memberObj?.event ?? {};
            if (!content) return;
            ct.requestAuthJSON(
              putStateEvent({
                pathParams: {
                  roomId,
                  eventType: StateEventType.RoomMember,
                  stateKey: ct.session.userId,
                },
                body: {
                  ...content,
                  avatar_url: payload,
                },
              })
            );
          }
        },
      },
      [Command.ConvertToDm]: {
        name: Command.ConvertToDm,
        description: 'Convert room to direct message',
        exe: async () => {
          const dmUserId = guessDmRoomUserId(
            membersAPI.memberEventsResult.value ?? [],
            ct.session.userId
          );
          await addRoomIdToMDirect(ct, roomId, dmUserId);
        },
      },
      [Command.ConvertToRoom]: {
        name: Command.ConvertToRoom,
        description: 'Convert direct message to room',
        exe: async () => {
          await removeRoomIdFromMDirect(ct, roomId);
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

          const serverMembers = servers?.flatMap((server) =>
            getServerMembers(membersAPI.memberEventsResult.value ?? [], server)
          );
          const serverUsers = serverMembers?.map((m) => m.userId);

          if (Array.isArray(serverUsers)) {
            serverUsers.forEach((user) => {
              if (!users.includes(user)) users.push(user);
            });
          }

          const tsResp = await ct.requestAuthJSON(
            getTimestampToEvent({
              pathParams: { roomId },
              searchParams: { ts, dir: 'f' },
            })
          );
          const [err, result] = await parseMatrixResp<GetTimestampToEventOK>(tsResp);
          if (err) {
            console.error(printMatrixError(err));
            return;
          }
          const startEventId = result.event_id;

          const ctxResp = await ct.requestAuthJSON(
            getContext({
              pathParams: { roomId, eventId: startEventId },
              searchParams: { limit: 0 },
            })
          );
          const [ctxErr, eventContext] = await parseMatrixResp<GetContextOK>(ctxResp);
          if (ctxErr) {
            console.error(printMatrixError(ctxErr));
            return;
          }

          let token: string | undefined = eventContext.start;
          while (token) {
            // eslint-disable-next-line no-await-in-loop
            const msgResp = await ct.requestAuthJSON(
              getMessages({
                pathParams: { roomId },
                searchParams: {
                  from: token,
                  limit: 20,
                  dir: 'f',
                },
              })
            );
            // eslint-disable-next-line no-await-in-loop
            const [msgErr, response] = await parseMatrixResp<GetMessagesOK>(msgResp);
            if (msgErr) {
              console.error(printMatrixError(msgErr));
              break;
            }
            const { end, chunk } = response;
            // remove until the latest event;
            token = end;

            const eventsToDelete = chunk.filter(
              (roomEvent) =>
                (messageTypes.length > 0 ? messageTypes.includes(roomEvent.type) : true) &&
                users.includes(roomEvent.sender) &&
                (!roomEvent.unsigned || !('redacted_because' in roomEvent.unsigned))
            );

            const eventIds = eventsToDelete.map((roomEvent) => roomEvent.event_id);

            // eslint-disable-next-line no-await-in-loop
            await rateLimitedActions(eventIds, async (eventId) => {
              const redactResp = await ct.requestAuthJSON(
                putRedact({
                  pathParams: { roomId, eventId, txnId: ct.getTxnId() },
                  body: { reason },
                })
              );
              const [redactErr] = await parseMatrixResp(redactResp);
              return redactErr;
            });
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

          const serverAclObj = await ct.storage.joinRoomState.read.get(
            getJoinRoomStateId(roomId, StateEventType.RoomServerAcl, '')
          );
          const serverAcl: RoomServerAclContent = serverAclObj?.event.content ?? {};

          const aclContent: RoomServerAclContent = {
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

          await ct.requestAuthJSON(
            putStateEvent({
              pathParams: { roomId, eventType: StateEventType.RoomServerAcl, stateKey: '' },
              body: aclContent,
            })
          );
        },
      },
    }),
    [ct, membersAPI, roomId, navigateRoom]
  );

  return commands;
};
