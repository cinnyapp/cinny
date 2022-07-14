import React from 'react';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { getUsername, getUsernameOfRoomMember } from '../../../util/matrixUtil';

import '../../i18n.jsx'
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';

function getTimelineJSXMessages() {

  return {

    join(user) {
      return (
        <>
        <Trans
          i18nKey={"RoomCommon.user_joined"}
          values={{user_name: twemojify(user)}}
          components={{bold: <b/>}}
        />
        </>
      );
    },
    leave(user, reason) {
      const reasonMsg = (typeof reason === 'string') ? `: ${reason}` : '';
      return (
        <>
        <Trans
          i18nKey={"RoomCommon.user_left"}
          values={{user_name: twemojify(user)}}
          components={{bold: <b/>}}
        />
        </>
      );
    },
    invite(inviter, user) {
      return (
        <>
        <Trans
          i18nKey={"RoomCommon.user_invited"}
          values={{user_name: twemojify(user), inviter_name: twemojify(inviter)}}
          components={{bold: <b/>}}
        />
        </>
      );
    },
    cancelInvite(inviter, user) {
      return (
        <>
        <Trans
          i18nKey={"RoomCommon.invite_cancelled"}
          values={{user_name: twemojify(user), inviter_name: twemojify(inviter)}}
          components={{bold: <b/>}}
        />
        </>
      );
    },
    rejectInvite(user) {
      return (
        <>
        <Trans
          i18nKey={"RoomCommon.invite_rejected"}
          values={{user_name: twemojify(user)}}
          components={{bold: <b/>}}
        />
        </>
      );
    },
    kick(actor, user, reason) {
      const reasonMsg = (typeof reason === 'string') ? `${reason}` : '';
      return (
        <>
        <Trans
          i18nKey={"RoomCommon.user_kicked"}
          values={{user_name: twemojify(user), actor: twemojify(actor), reason: twemojify(reasonMsg)}}
          components={{bold: <b/>}}
        />
        </>
      );
    },
    ban(actor, user, reason) {
      const reasonMsg = (typeof reason === 'string') ? `${reason}` : '';
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.user_banned"}
          values={{user_name: twemojify(user), actor: twemojify(actor), reason: twemojify(reasonMsg)}}
          components={{bold: <b/>}}
          />
        </>
      );
    },
    unban(actor, user) {
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.user_unbanned"}
          values={{user_name: twemojify(user), actor: twemojify(actor)}}
          components={{bold: <b/>}}
          />
        </>
      );
    },
    avatarSets(user) {
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.avatar_set"}
          values={{user_name: twemojify(user)}}
          components={{bold: <b/>}}
          />
        </>
      );
    },
    avatarChanged(user) {
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.avatar_changed"}
          values={{user_name: twemojify(user)}}
          components={{bold: <b/>}}
          />
        </>
      );
    },
    avatarRemoved(user) {
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.avatar_removed"}
          values={{user_name: twemojify(user)}}
          components={{bold: <b/>}}
          />
        </>
      );
    },
    nameSets(user, newName) {
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.name_set"}
          values={{user_name: twemojify(user), new_name: twemojify(newName)}}
          components={{bold: <b/>}}
          />
        </>
      );
    },
    nameChanged(user, newName) {
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.name_changed"}
          values={{user_name: twemojify(user), new_name: twemojify(newName)}}
          components={{bold: <b/>}}
          />
        </>
      );
    },
    nameRemoved(user, lastName) {
      return (
        <>
          <Trans
          i18nKey={"RoomCommon.name_removed"}
          values={{user_name: twemojify(user), new_name: twemojify(newName)}}
          components={{bold: <b/>}}
          />
        </>
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
  return <>{u1Jsx}, {u2Jsx}, {u3Jsx} and {othersCount} other are {actionStr}</>;
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
