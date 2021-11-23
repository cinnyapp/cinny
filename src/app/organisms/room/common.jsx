import React from 'react';

import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { sanitizeText } from '../../../util/sanitize';

import initMatrix from '../../../client/initMatrix';
import { getUsername, getUsernameOfRoomMember } from '../../../util/matrixUtil';

const getEmojifiedJsx = (username) => parse(twemoji.parse(sanitizeText(username)));

function getTimelineJSXMessages() {
  return {
    join(user) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' joined the room'}
        </>
      );
    },
    leave(user, reason) {
      const reasonMsg = (typeof reason === 'string') ? `: ${reason}` : '';
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' left the room'}
          {getEmojifiedJsx(reasonMsg)}
        </>
      );
    },
    invite(inviter, user) {
      return (
        <>
          <b>{getEmojifiedJsx(inviter)}</b>
          {' invited '}
          <b>{getEmojifiedJsx(user)}</b>
        </>
      );
    },
    cancelInvite(inviter, user) {
      return (
        <>
          <b>{getEmojifiedJsx(inviter)}</b>
          {' canceled '}
          <b>{getEmojifiedJsx(user)}</b>
          {'\'s invite'}
        </>
      );
    },
    rejectInvite(user) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' rejected the invitation'}
        </>
      );
    },
    kick(actor, user, reason) {
      const reasonMsg = (typeof reason === 'string') ? `: ${reason}` : '';
      return (
        <>
          <b>{getEmojifiedJsx(actor)}</b>
          {' kicked '}
          <b>{getEmojifiedJsx(user)}</b>
          {getEmojifiedJsx(reasonMsg)}
        </>
      );
    },
    ban(actor, user, reason) {
      const reasonMsg = (typeof reason === 'string') ? `: ${reason}` : '';
      return (
        <>
          <b>{getEmojifiedJsx(actor)}</b>
          {' banned '}
          <b>{getEmojifiedJsx(user)}</b>
          {getEmojifiedJsx(reasonMsg)}
        </>
      );
    },
    unban(actor, user) {
      return (
        <>
          <b>{getEmojifiedJsx(actor)}</b>
          {' unbanned '}
          <b>{getEmojifiedJsx(user)}</b>
        </>
      );
    },
    avatarSets(user) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' set the avatar'}
        </>
      );
    },
    avatarChanged(user) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' changed the avatar'}
        </>
      );
    },
    avatarRemoved(user) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' removed the avatar'}
        </>
      );
    },
    nameSets(user, newName) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' set the display name to '}
          <b>{getEmojifiedJsx(newName)}</b>
        </>
      );
    },
    nameChanged(user, newName) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' changed the display name to '}
          <b>{getEmojifiedJsx(newName)}</b>
        </>
      );
    },
    nameRemoved(user, lastName) {
      return (
        <>
          <b>{getEmojifiedJsx(user)}</b>
          {' removed the display name '}
          <b>{getEmojifiedJsx(lastName)}</b>
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
  const getUserJSX = (userId) => <b>{getEmojifiedJsx(getUserDisplayName(userId))}</b>;
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
