import React from 'react';

import { getUsername } from '../../../util/matrixUtil';

function getTimelineJSXMessages() {
  return {
    join(user) {
      return (
        <>
          <b>{user}</b>
          {' joined the channel'}
        </>
      );
    },
    leave(user) {
      return (
        <>
          <b>{user}</b>
          {' left the channel'}
        </>
      );
    },
    invite(inviter, user) {
      return (
        <>
          <b>{inviter}</b>
          {' invited '}
          <b>{user}</b>
        </>
      );
    },
    cancelInvite(inviter, user) {
      return (
        <>
          <b>{inviter}</b>
          {' canceled '}
          <b>{user}</b>
          {'\'s invite'}
        </>
      );
    },
    rejectInvite(user) {
      return (
        <>
          <b>{user}</b>
          {' rejected the invitation'}
        </>
      );
    },
    kick(actor, user, reason) {
      const reasonMsg = (typeof reason === 'string') ? ` for ${reason}` : '';
      return (
        <>
          <b>{actor}</b>
          {' kicked '}
          <b>{user}</b>
          {reasonMsg}
        </>
      );
    },
    ban(actor, user, reason) {
      const reasonMsg = (typeof reason === 'string') ? ` for ${reason}` : '';
      return (
        <>
          <b>{actor}</b>
          {' banned '}
          <b>{user}</b>
          {reasonMsg}
        </>
      );
    },
    unban(actor, user) {
      return (
        <>
          <b>{actor}</b>
          {' unbanned '}
          <b>{user}</b>
        </>
      );
    },
    avatarSets(user) {
      return (
        <>
          <b>{user}</b>
          {' set the avatar'}
        </>
      );
    },
    avatarChanged(user) {
      return (
        <>
          <b>{user}</b>
          {' changed the avatar'}
        </>
      );
    },
    avatarRemoved(user) {
      return (
        <>
          <b>{user}</b>
          {' removed the avatar'}
        </>
      );
    },
    nameSets(user, newName) {
      return (
        <>
          <b>{user}</b>
          {' set the display name to '}
          <b>{newName}</b>
        </>
      );
    },
    nameChanged(user, newName) {
      return (
        <>
          <b>{user}</b>
          {' changed the display name to '}
          <b>{newName}</b>
        </>
      );
    },
    nameRemoved(user, lastName) {
      return (
        <>
          <b>{user}</b>
          {' removed the display name '}
          <b>{lastName}</b>
        </>
      );
    },
  };
}

function getUsersActionJsx(userIds, actionStr) {
  const getUserJSX = (username) => <b>{getUsername(username)}</b>;
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

function parseReply(rawContent) {
  if (rawContent.indexOf('>') !== 0) return null;
  let content = rawContent.slice(rawContent.indexOf('@'));
  const userId = content.slice(0, content.indexOf('>'));

  content = content.slice(content.indexOf('>') + 2);
  const replyContent = content.slice(0, content.indexOf('\n\n'));
  content = content.slice(content.indexOf('\n\n') + 2);

  if (userId === '') return null;

  return {
    userId,
    replyContent,
    content,
  };
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
          default: return makeReturnObj('leave', tJSXMsgs.leave(senderName));
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

function scrollToBottom(ref) {
  const maxScrollTop = ref.current.scrollHeight - ref.current.offsetHeight;
  // eslint-disable-next-line no-param-reassign
  ref.current.scrollTop = maxScrollTop;
}

function isAtBottom(ref) {
  const { scrollHeight, scrollTop, offsetHeight } = ref.current;
  const scrollUptoBottom = scrollTop + offsetHeight;

  // scroll view have to div inside div which contains messages
  const lastMessage = ref.current.lastElementChild.lastElementChild.lastElementChild;
  const lastChildHeight = lastMessage.offsetHeight;

  // auto scroll to bottom even if user has EXTRA_SPACE left to scroll
  const EXTRA_SPACE = 48;

  if (scrollHeight - scrollUptoBottom <= lastChildHeight + EXTRA_SPACE) {
    return true;
  }
  return false;
}

function autoScrollToBottom(ref) {
  if (isAtBottom(ref)) scrollToBottom(ref);
}

export {
  getTimelineJSXMessages,
  getUsersActionJsx,
  parseReply,
  parseTimelineChange,
  scrollToBottom,
  isAtBottom,
  autoScrollToBottom,
};
