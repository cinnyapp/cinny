import React from 'react';

import { Trans } from 'react-i18next';
import { twemojify, Twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { getUsername, getUsernameOfRoomMember } from '../../../util/matrixUtil';

import '../../i18n';

function getTimelineJSXMessages() {
  return {

    join(user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.user_joined"
          components={{ bold: <b />, user: <Twemojify text={user} /> }}
        />
      );
    },
    leave(user, reason) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.user_left"
          context={(typeof reason === 'string') ? 'reason' : null}
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            reason: <Twemojify text={reason} />,
          }}
        />
      );
    },
    invite(inviter, user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.user_invited"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            inviter: <Twemojify text={inviter} />,
          }}
        />
      );
    },
    cancelInvite(inviter, user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.invite_cancelled"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            inviter: <Twemojify text={inviter} />,
          }}
        />
      );
    },
    rejectInvite(user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.invite_rejected"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
          }}
        />
      );
    },
    kick(actor, user, reason) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.user_kicked"
          context={(typeof reason === 'string') ? 'reason' : null}
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            actor: <Twemojify text={actor} />,
            reason: <Twemojify text={reason} />,
          }}
        />
      );
    },
    ban(actor, user, reason) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.user_banned"
          context={(typeof reason === 'string') ? 'reason' : null}
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            actor: <Twemojify text={actor} />,
            reason: <Twemojify text={reason} />,
          }}
        />
      );
    },
    unban(actor, user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.user_unbanned"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            actor: <Twemojify text={actor} />,
          }}
        />
      );
    },
    avatarSets(user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.avatar_set"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
          }}
        />
      );
    },
    avatarChanged(user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.avatar_changed"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
          }}
        />
      );
    },
    avatarRemoved(user) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.avatar_removed"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
          }}
        />
      );
    },
    nameSets(user, newName) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.name_set"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            new_name: <Twemojify text={newName} />,
          }}
        />
      );
    },
    nameChanged(user, newName) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.name_changed"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            new_name: <Twemojify text={newName} />,
          }}
        />
      );
    },
    nameRemoved(user, lastName) {
      return (
        <Trans
          i18nKey="Organisms.RoomCommon.name_removed"
          components={{
            bold: <b />,
            user: <Twemojify text={user} />,
            last_name: <Twemojify text={lastName} />,
          }}
        />
      );
    },
  };
}

function getUsersActionJsx(roomId, userIds, actionStr) {
  const room = initMatrix.matrixClient.getRoom(roomId);
  const getUserDisplayName = (userId) => {
    if (room?.getMember(userId)) return getUsernameOfRoomMember(room.getMember(userId));
    return getUsername(userId);
  };
  const getUserJSX = (userId) => <b>{twemojify(getUserDisplayName(userId))}</b>;
  if (!Array.isArray(userIds)) return 'Idle';
  if (userIds.length === 0) return 'Idle';
  const MAX_VISIBLE_COUNT = 3;

  const u1Jsx = getUserJSX(userIds[0]);
  // eslint-disable-next-line react/jsx-one-expression-per-line
  if (userIds.length === 1) return <>{u1Jsx} is {actionStr}</>;

  const u2Jsx = getUserJSX(userIds[1]);
  // eslint-disable-next-line react/jsx-one-expression-per-line
  if (userIds.length === 2) return <>{u1Jsx} and {u2Jsx} are {actionStr}</>;

  const u3Jsx = getUserJSX(userIds[2]);
  if (userIds.length === 3) {
    // eslint-disable-next-line react/jsx-one-expression-per-line
    return <>{u1Jsx}, {u2Jsx} and {u3Jsx} are {actionStr}</>;
  }

  const othersCount = userIds.length - MAX_VISIBLE_COUNT;
  // eslint-disable-next-line react/jsx-one-expression-per-line
  return <>{u1Jsx}, {u2Jsx}, {u3Jsx} and {othersCount} others are {actionStr}</>;
}

function parseTimelineChange(mEvent) {
  const tJSXMsgs = getTimelineJSXMessages();
  const makeReturnObj = (variant, content) => ({
    variant,
    content,
  });
  const content = mEvent.getContent();
  const prevContent = mEvent.getPrevContent();
  const sender = mEvent.getSender();
  const senderName = getUsername(sender);
  const userName = getUsername(mEvent.getStateKey());

  switch (content.membership) {
    case 'invite': return makeReturnObj('invite', tJSXMsgs.invite(senderName, userName));
    case 'ban': return makeReturnObj('leave', tJSXMsgs.ban(senderName, userName, content.reason));
    case 'join':
      if (prevContent.membership === 'join') {
        if (content.displayname !== prevContent.displayname) {
          if (typeof content.displayname === 'undefined') return makeReturnObj('avatar', tJSXMsgs.nameRemoved(sender, prevContent.displayname));
          if (typeof prevContent.displayname === 'undefined') return makeReturnObj('avatar', tJSXMsgs.nameSets(sender, content.displayname));
          return makeReturnObj('avatar', tJSXMsgs.nameChanged(prevContent.displayname, content.displayname));
        }
        if (content.avatar_url !== prevContent.avatar_url) {
          if (typeof content.avatar_url === 'undefined') return makeReturnObj('avatar', tJSXMsgs.avatarRemoved(content.displayname));
          if (typeof prevContent.avatar_url === 'undefined') return makeReturnObj('avatar', tJSXMsgs.avatarSets(content.displayname));
          return makeReturnObj('avatar', tJSXMsgs.avatarChanged(content.displayname));
        }
        return null;
      }
      return makeReturnObj('join', tJSXMsgs.join(senderName));
    case 'leave':
      if (sender === mEvent.getStateKey()) {
        switch (prevContent.membership) {
          case 'invite': return makeReturnObj('invite-cancel', tJSXMsgs.rejectInvite(senderName));
          default: return makeReturnObj('leave', tJSXMsgs.leave(senderName, content.reason));
        }
      }
      switch (prevContent.membership) {
        case 'invite': return makeReturnObj('invite-cancel', tJSXMsgs.cancelInvite(senderName, userName));
        case 'ban': return makeReturnObj('other', tJSXMsgs.unban(senderName, userName));
        // sender is not target and made the target leave,
        // if not from invite/ban then this is a kick
        default: return makeReturnObj('leave', tJSXMsgs.kick(senderName, userName, content.reason));
      }
    default: return null;
  }
}

export {
  getTimelineJSXMessages,
  getUsersActionJsx,
  parseTimelineChange,
};
