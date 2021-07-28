/* eslint-disable react/prop-types */
import React, {
  useState, useEffect, useLayoutEffect, useRef,
} from 'react';
import PropTypes from 'prop-types';
import './ChannelView.scss';

import EventEmitter from 'events';

import TextareaAutosize from 'react-autosize-textarea';
import dateFormat from 'dateformat';
import initMatrix from '../../../client/initMatrix';
import { getUsername, doesRoomHaveUnread } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import RoomTimeline from '../../../client/state/RoomTimeline';
import cons from '../../../client/state/cons';
import { togglePeopleDrawer, openInviteUser } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';
import {
  bytesToSize,
  diffMinutes,
  isNotInSameDay,
} from '../../../util/common';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import Avatar from '../../atoms/avatar/Avatar';
import IconButton from '../../atoms/button/IconButton';
import ContextMenu, { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';
import ScrollView from '../../atoms/scroll/ScrollView';
import Divider from '../../atoms/divider/Divider';
import Message, { PlaceholderMessage } from '../../molecules/message/Message';
import * as Media from '../../molecules/media/Media';
import TimelineChange from '../../molecules/message/TimelineChange';
import ChannelIntro from '../../molecules/channel-intro/ChannelIntro';
import EmojiBoard from '../emoji-board/EmojiBoard';

import UserIC from '../../../../public/res/ic/outlined/user.svg';
import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';
import CirclePlusIC from '../../../../public/res/ic/outlined/circle-plus.svg';
import EmojiIC from '../../../../public/res/ic/outlined/emoji.svg';
import SendIC from '../../../../public/res/ic/outlined/send.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import ShieldIC from '../../../../public/res/ic/outlined/shield.svg';
import VLCIC from '../../../../public/res/ic/outlined/vlc.svg';
import VolumeFullIC from '../../../../public/res/ic/outlined/volume-full.svg';
import FileIC from '../../../../public/res/ic/outlined/file.svg';

const MAX_MSG_DIFF_MINUTES = 5;
const viewEvent = new EventEmitter();

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

function ChannelViewHeader({ roomId }) {
  const mx = initMatrix.matrixClient;
  const avatarSrc = mx.getRoom(roomId).getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
  const roomName = mx.getRoom(roomId).name;
  const isDM = initMatrix.roomList.directs.has(roomId);
  const roomTopic = mx.getRoom(roomId).currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;

  return (
    <Header>
      <Avatar imageSrc={avatarSrc} text={roomName.slice(0, 1)} bgColor={colorMXID(roomName)} size="small" />
      <TitleWrapper>
        <Text variant="h2">{roomName}</Text>
        { typeof roomTopic !== 'undefined' && <p title={roomTopic} className="text text-b3">{roomTopic}</p>}
      </TitleWrapper>
      <IconButton onClick={togglePeopleDrawer} tooltip="People" src={UserIC} />
      <ContextMenu
        placement="bottom"
        content={(toogleMenu) => (
          <>
            <MenuHeader>Options</MenuHeader>
            {/* <MenuBorder /> */}
            <MenuItem
              iconSrc={AddUserIC}
              onClick={() => {
                openInviteUser(roomId); toogleMenu();
              }}
            >
              Invite
            </MenuItem>
            <MenuItem iconSrc={LeaveArrowIC} variant="danger" onClick={() => roomActions.leave(roomId, isDM)}>Leave</MenuItem>
          </>
        )}
        render={(toggleMenu) => <IconButton onClick={toggleMenu} tooltip="Options" src={VerticalMenuIC} />}
      />
    </Header>
  );
}
ChannelViewHeader.propTypes = {
  roomId: PropTypes.string.isRequired,
};

let wasAtBottom = true;
function ChannelViewContent({ roomId, roomTimeline, timelineScroll }) {
  const [isReachedTimelineEnd, setIsReachedTimelineEnd] = useState(false);
  const [onStateUpdate, updateState] = useState(null);
  const [onPagination, setOnPagination] = useState(null);
  const mx = initMatrix.matrixClient;

  function autoLoadTimeline() {
    if (timelineScroll.isScrollable() === true) return;
    roomTimeline.paginateBack();
  }
  function trySendingReadReceipt() {
    const { room, timeline } = roomTimeline;
    if (doesRoomHaveUnread(room) && timeline.length !== 0) {
      mx.sendReadReceipt(timeline[timeline.length - 1]);
    }
  }

  function onReachedTop() {
    if (roomTimeline.isOngoingPagination || isReachedTimelineEnd) return;
    roomTimeline.paginateBack();
  }
  function toggleOnReachedBottom(isBottom) {
    wasAtBottom = isBottom;
    if (!isBottom) return;
    trySendingReadReceipt();
  }

  const updatePAG = (canPagMore) => {
    if (!canPagMore) {
      setIsReachedTimelineEnd(true);
    } else {
      setOnPagination({});
      autoLoadTimeline();
    }
  };
  // force update RoomTimeline on cons.events.roomTimeline.EVENT
  const updateRT = () => {
    if (wasAtBottom) {
      trySendingReadReceipt();
    }
    updateState({});
  };

  useEffect(() => {
    setIsReachedTimelineEnd(false);
    wasAtBottom = true;
  }, [roomId]);
  useEffect(() => trySendingReadReceipt(), [roomTimeline]);

  // init room setup completed.
  // listen for future. setup stateUpdate listener.
  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.EVENT, updateRT);
    roomTimeline.on(cons.events.roomTimeline.PAGINATED, updatePAG);
    viewEvent.on('reached-top', onReachedTop);
    viewEvent.on('toggle-reached-bottom', toggleOnReachedBottom);

    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.EVENT, updateRT);
      roomTimeline.removeListener(cons.events.roomTimeline.PAGINATED, updatePAG);
      viewEvent.removeListener('reached-top', onReachedTop);
      viewEvent.removeListener('toggle-reached-bottom', toggleOnReachedBottom);
    };
  }, [roomTimeline, isReachedTimelineEnd, onPagination]);

  useLayoutEffect(() => {
    timelineScroll.reachBottom();
    autoLoadTimeline();
  }, [roomTimeline]);

  useLayoutEffect(() => {
    if (onPagination === null) return;
    timelineScroll.tryRestoringScroll();
  }, [onPagination]);

  useEffect(() => {
    if (onStateUpdate === null) return;
    if (wasAtBottom) timelineScroll.reachBottom();
  }, [onStateUpdate]);

  let prevMEvent = null;
  function renderMessage(mEvent) {
    function isMedia(mE) {
      return (
        mE.getContent()?.msgtype === 'm.file'
        || mE.getContent()?.msgtype === 'm.image'
        || mE.getContent()?.msgtype === 'm.audio'
        || mE.getContent()?.msgtype === 'm.video'
      );
    }
    function genMediaContent(mE) {
      const mContent = mE.getContent();
      let mediaMXC = mContent.url;
      let thumbnailMXC = mContent?.info?.thumbnail_url;
      const isEncryptedFile = typeof mediaMXC === 'undefined';
      if (isEncryptedFile) mediaMXC = mContent.file.url;

      switch (mE.getContent()?.msgtype) {
        case 'm.file':
          return (
            <Media.File
              name={mContent.body}
              link={mx.mxcUrlToHttp(mediaMXC)}
              file={mContent.file}
              type={mContent.info.mimetype}
            />
          );
        case 'm.image':
          return (
            <Media.Image
              name={mContent.body}
              width={mContent.info.w || null}
              height={mContent.info.h || null}
              link={mx.mxcUrlToHttp(mediaMXC)}
              file={isEncryptedFile ? mContent.file : null}
              type={mContent.info.mimetype}
            />
          );
        case 'm.audio':
          return (
            <Media.Audio
              name={mContent.body}
              link={mx.mxcUrlToHttp(mediaMXC)}
              type={mContent.info.mimetype}
              file={mContent.file}
            />
          );
        case 'm.video':
          if (typeof thumbnailMXC === 'undefined') {
            thumbnailMXC = mContent.info?.thumbnail_file?.url || null;
          }
          return (
            <Media.Video
              name={mContent.body}
              link={mx.mxcUrlToHttp(mediaMXC)}
              thumbnail={thumbnailMXC === null ? null : mx.mxcUrlToHttp(thumbnailMXC)}
              thumbnailFile={isEncryptedFile ? mContent.info.thumbnail_file : null}
              thumbnailType={mContent.info.thumbnail_info?.mimetype || null}
              width={mContent.info.w || null}
              height={mContent.info.h || null}
              file={isEncryptedFile ? mContent.file : null}
              type={mContent.info.mimetype}
            />
          );
        default:
          return 'Unable to attach media file!';
      }
    }

    if (mEvent.getType() === 'm.room.create') {
      const roomTopic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;
      return (
        <ChannelIntro
          key={mEvent.getId()}
          avatarSrc={roomTimeline.room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 80, 80, 'crop')}
          name={roomTimeline.room.name}
          heading={`Welcome to ${roomTimeline.room.name}`}
          desc={`This is the beginning of ${roomTimeline.room.name} channel.${typeof roomTopic !== 'undefined' ? (` Topic: ${roomTopic}`) : ''}`}
          time={`Created at ${dateFormat(mEvent.getDate(), 'dd mmmm yyyy, hh:MM TT')}`}
        />
      );
    }
    if (
      mEvent.getType() !== 'm.room.message'
      && mEvent.getType() !== 'm.room.encrypted'
      && mEvent.getType() !== 'm.room.member'
    ) return false;
    if (mEvent.getRelation()?.rel_type === 'm.replace') return false;

    // ignore if message is deleted
    if (mEvent.isRedacted()) return false;

    let divider = null;
    if (prevMEvent !== null && isNotInSameDay(mEvent.getDate(), prevMEvent.getDate())) {
      divider = <Divider key={`divider-${mEvent.getId()}`} text={`${dateFormat(mEvent.getDate(), 'mmmm dd, yyyy')}`} />;
    }

    if (mEvent.getType() !== 'm.room.member') {
      const isContentOnly = (
        prevMEvent !== null
        && prevMEvent.getType() !== 'm.room.member'
        && diffMinutes(mEvent.getDate(), prevMEvent.getDate()) <= MAX_MSG_DIFF_MINUTES
        && prevMEvent.getSender() === mEvent.getSender()
      );

      let content = mEvent.getContent().body;
      if (typeof content === 'undefined') return null;
      let reply = null;
      let reactions = null;
      let isMarkdown = mEvent.getContent().format === 'org.matrix.custom.html';
      const isReply = typeof mEvent.getWireContent()['m.relates_to']?.['m.in_reply_to'] !== 'undefined';
      const isEdited = roomTimeline.editedTimeline.has(mEvent.getId());
      const haveReactions = roomTimeline.reactionTimeline.has(mEvent.getId());

      if (isReply) {
        const parsedContent = parseReply(content);

        if (parsedContent !== null) {
          const username = getUsername(parsedContent.userId);
          reply = {
            color: colorMXID(parsedContent.userId),
            to: username,
            content: parsedContent.replyContent,
          };
          content = parsedContent.content;
        }
      }

      if (isEdited) {
        const editedList = roomTimeline.editedTimeline.get(mEvent.getId());
        const latestEdited = editedList[editedList.length - 1];
        if (typeof latestEdited.getContent()['m.new_content'] === 'undefined') return null;
        const latestEditBody = latestEdited.getContent()['m.new_content'].body;
        const parsedEditedContent = parseReply(latestEditBody);
        isMarkdown = latestEdited.getContent()['m.new_content'].format === 'org.matrix.custom.html';
        if (parsedEditedContent === null) {
          content = latestEditBody;
        } else {
          content = parsedEditedContent.content;
        }
      }

      if (haveReactions) {
        reactions = [];
        roomTimeline.reactionTimeline.get(mEvent.getId()).forEach((rEvent) => {
          if (rEvent.getRelation() === null) return;
          function alreadyHaveThisReaction(rE) {
            for (let i = 0; i < reactions.length; i += 1) {
              if (reactions[i].key === rE.getRelation().key) return true;
            }
            return false;
          }
          if (alreadyHaveThisReaction(rEvent)) {
            for (let i = 0; i < reactions.length; i += 1) {
              if (reactions[i].key === rEvent.getRelation().key) {
                reactions[i].count += 1;
                if (reactions[i].active !== true) {
                  reactions[i].active = rEvent.getSender() === initMatrix.matrixClient.getUserId();
                }
                break;
              }
            }
          } else {
            reactions.push({
              id: rEvent.getId(),
              key: rEvent.getRelation().key,
              count: 1,
              active: (rEvent.getSender() === initMatrix.matrixClient.getUserId()),
            });
          }
        });
      }

      const myMessageEl = (
        <React.Fragment key={`box-${mEvent.getId()}`}>
          {divider}
          { isMedia(mEvent) ? (
            <Message
              key={mEvent.getId()}
              contentOnly={isContentOnly}
              markdown={isMarkdown}
              avatarSrc={mEvent.sender.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop')}
              color={colorMXID(mEvent.sender.userId)}
              name={getUsername(mEvent.sender.userId)}
              content={genMediaContent(mEvent)}
              reply={reply}
              time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
              edited={isEdited}
              reactions={reactions}
            />
          ) : (
            <Message
              key={mEvent.getId()}
              contentOnly={isContentOnly}
              markdown={isMarkdown}
              avatarSrc={mEvent.sender.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop')}
              color={colorMXID(mEvent.sender.userId)}
              name={getUsername(mEvent.sender.userId)}
              content={content}
              reply={reply}
              time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
              edited={isEdited}
              reactions={reactions}
            />
          )}
        </React.Fragment>
      );

      prevMEvent = mEvent;
      return myMessageEl;
    }
    prevMEvent = mEvent;
    const timelineChange = parseTimelineChange(mEvent);
    if (timelineChange === null) return null;
    return (
      <React.Fragment key={`box-${mEvent.getId()}`}>
        {divider}
        <TimelineChange
          key={mEvent.getId()}
          variant={timelineChange.variant}
          content={timelineChange.content}
          time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
        />
      </React.Fragment>
    );
  }

  const roomTopic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;
  return (
    <div className="channel-view__content">
      <div className="timeline__wrapper">
        {
          roomTimeline.timeline[0].getType() !== 'm.room.create' && !isReachedTimelineEnd && (
            <>
              <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
              <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
              <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
            </>
          )
        }
        {
          roomTimeline.timeline[0].getType() !== 'm.room.create' && isReachedTimelineEnd && (
            <ChannelIntro
              key={Math.random().toString(20).substr(2, 6)}
              avatarSrc={roomTimeline.room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 80, 80, 'crop')}
              name={roomTimeline.room.name}
              heading={`Welcome to ${roomTimeline.room.name}`}
              desc={`This is the beginning of ${roomTimeline.room.name} channel.${typeof roomTopic !== 'undefined' ? (` Topic: ${roomTopic}`) : ''}`}
            />
          )
        }
        { roomTimeline.timeline.map(renderMessage) }
      </div>
    </div>
  );
}
ChannelViewContent.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  timelineScroll: PropTypes.shape({
    reachBottom: PropTypes.func,
    autoReachBottom: PropTypes.func,
    tryRestoringScroll: PropTypes.func,
    enableSmoothScroll: PropTypes.func,
    disableSmoothScroll: PropTypes.func,
    isScrollable: PropTypes.func,
  }).isRequired,
};

function FloatingOptions({
  roomId, roomTimeline, timelineScroll,
}) {
  const [reachedBottom, setReachedBottom] = useState(true);
  const [typingMembers, setTypingMembers] = useState(new Set());
  const mx = initMatrix.matrixClient;

  function isSomeoneTyping(members) {
    const m = members;
    m.delete(mx.getUserId());
    if (m.size === 0) return false;
    return true;
  }

  function getTypingMessage(members) {
    const userIds = members;
    userIds.delete(mx.getUserId());
    return getUsersActionJsx([...userIds], 'typing...');
  }

  function updateTyping(members) {
    setTypingMembers(members);
  }

  useEffect(() => {
    setReachedBottom(true);
    setTypingMembers(new Set());
    viewEvent.on('toggle-reached-bottom', setReachedBottom);
    return () => viewEvent.removeListener('toggle-reached-bottom', setReachedBottom);
  }, [roomId]);

  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, updateTyping);
    return () => {
      roomTimeline?.removeListener(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, updateTyping);
    };
  }, [roomTimeline]);

  return (
    <>
      <div className={`channel-view__typing${isSomeoneTyping(typingMembers) ? ' channel-view__typing--open' : ''}`}>
        <div className="bouncingLoader"><div /></div>
        <Text variant="b2">{getTypingMessage(typingMembers)}</Text>
      </div>
      <div className={`channel-view__STB${reachedBottom ? '' : ' channel-view__STB--open'}`}>
        <IconButton
          onClick={() => {
            timelineScroll.enableSmoothScroll();
            timelineScroll.reachBottom();
            timelineScroll.disableSmoothScroll();
          }}
          src={ChevronBottomIC}
          tooltip="Scroll to Bottom"
        />
      </div>
    </>
  );
}
FloatingOptions.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  timelineScroll: PropTypes.shape({
    reachBottom: PropTypes.func,
  }).isRequired,
};

function ChannelViewSticky({ children }) {
  return <div className="channel-view__sticky">{children}</div>;
}
ChannelViewSticky.propTypes = { children: PropTypes.node.isRequired };

let isTyping = false;
function ChannelInput({
  roomId, roomTimeline, timelineScroll,
}) {
  const [attachment, setAttachment] = useState(null);

  const textAreaRef = useRef(null);
  const inputBaseRef = useRef(null);
  const uploadInputRef = useRef(null);
  const uploadProgressRef = useRef(null);

  const TYPING_TIMEOUT = 5000;
  const mx = initMatrix.matrixClient;
  const { roomsInput } = initMatrix;

  const sendIsTyping = (isT) => {
    mx.sendTyping(roomId, isT, isT ? TYPING_TIMEOUT : undefined);
    isTyping = isT;

    if (isT === true) {
      setTimeout(() => {
        if (isTyping) sendIsTyping(false);
      }, TYPING_TIMEOUT);
    }
  };

  function uploadingProgress(myRoomId, { loaded, total }) {
    if (myRoomId !== roomId) return;
    const progressPer = Math.round((loaded * 100) / total);
    uploadProgressRef.current.textContent = `Uploading: ${bytesToSize(loaded)}/${bytesToSize(total)} (${progressPer}%)`;
    inputBaseRef.current.style.backgroundImage = `linear-gradient(90deg, var(--bg-surface-hover) ${progressPer}%, var(--bg-surface-low) ${progressPer}%)`;
  }
  function clearAttachment(myRoomId) {
    if (roomId !== myRoomId) return;
    setAttachment(null);
    inputBaseRef.current.style.backgroundImage = 'unset';
    uploadInputRef.current.value = null;
  }

  useEffect(() => {
    roomsInput.on(cons.events.roomsInput.UPLOAD_PROGRESS_CHANGES, uploadingProgress);
    roomsInput.on(cons.events.roomsInput.ATTACHMENT_CANCELED, clearAttachment);
    roomsInput.on(cons.events.roomsInput.FILE_UPLOADED, clearAttachment);
    if (textAreaRef?.current !== null) {
      isTyping = false;
      textAreaRef.current.focus();
      textAreaRef.current.value = roomsInput.getMessage(roomId);
      setAttachment(roomsInput.getAttachment(roomId));
    }
    return () => {
      roomsInput.removeListener(cons.events.roomsInput.UPLOAD_PROGRESS_CHANGES, uploadingProgress);
      roomsInput.removeListener(cons.events.roomsInput.ATTACHMENT_CANCELED, clearAttachment);
      roomsInput.removeListener(cons.events.roomsInput.FILE_UPLOADED, clearAttachment);
      if (textAreaRef?.current === null) return;

      const msg = textAreaRef.current.value;
      inputBaseRef.current.style.backgroundImage = 'unset';
      if (msg.trim() === '') {
        roomsInput.setMessage(roomId, '');
        return;
      }
      roomsInput.setMessage(roomId, msg);
    };
  }, [roomId]);

  async function sendMessage() {
    const msgBody = textAreaRef.current.value;
    if (roomsInput.isSending(roomId)) return;
    if (msgBody.trim() === '' && attachment === null) return;
    sendIsTyping(false);

    roomsInput.setMessage(roomId, msgBody);
    if (attachment !== null) {
      roomsInput.setAttachment(roomId, attachment);
    }
    textAreaRef.current.disabled = true;
    textAreaRef.current.style.cursor = 'not-allowed';
    await roomsInput.sendInput(roomId);
    textAreaRef.current.disabled = false;
    textAreaRef.current.style.cursor = 'unset';
    textAreaRef.current.focus();

    textAreaRef.current.value = roomsInput.getMessage(roomId);
    timelineScroll.reachBottom();
    viewEvent.emit('message_sent');
    textAreaRef.current.style.height = 'unset';
  }

  function processTyping(msg) {
    const isEmptyMsg = msg === '';

    if (isEmptyMsg && isTyping) {
      sendIsTyping(false);
      return;
    }
    if (!isEmptyMsg && !isTyping) {
      sendIsTyping(true);
    }
  }

  function handleMsgTyping(e) {
    const msg = e.target.value;
    processTyping(msg);
  }

  function handleKeyDown(e) {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault();
      sendMessage();
    }
  }

  function addEmoji(emoji) {
    textAreaRef.current.value += emoji.unicode;
  }

  function handleUploadClick() {
    if (attachment === null) uploadInputRef.current.click();
    else {
      roomsInput.cancelAttachment(roomId);
    }
  }
  function uploadFileChange(e) {
    const file = e.target.files.item(0);
    setAttachment(file);
    if (file !== null) roomsInput.setAttachment(roomId, file);
  }

  function renderInputs() {
    return (
      <>
        <div className={`channel-input__option-container${attachment === null ? '' : ' channel-attachment__option'}`}>
          <input onChange={uploadFileChange} style={{ display: 'none' }} ref={uploadInputRef} type="file" />
          <IconButton onClick={handleUploadClick} tooltip={attachment === null ? 'Upload' : 'Cancel'} src={CirclePlusIC} />
        </div>
        <div ref={inputBaseRef} className="channel-input__input-container">
          {roomTimeline.isEncryptedRoom() && <RawIcon size="extra-small" src={ShieldIC} />}
          <ScrollView autoHide>
            <Text className="channel-input__textarea-wrapper">
              <TextareaAutosize
                ref={textAreaRef}
                onChange={handleMsgTyping}
                onResize={() => timelineScroll.autoReachBottom()}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
              />
            </Text>
          </ScrollView>
        </div>
        <div className="channel-input__option-container">
          <ContextMenu
            placement="top"
            content={(
              <EmojiBoard onSelect={addEmoji} />
            )}
            render={(toggleMenu) => <IconButton onClick={toggleMenu} tooltip="Emoji" src={EmojiIC} />}
          />
          <IconButton onClick={sendMessage} tooltip="Send" src={SendIC} />
        </div>
      </>
    );
  }

  function attachFile() {
    const fileType = attachment.type.slice(0, attachment.type.indexOf('/'));
    return (
      <div className="channel-attachment">
        <div className={`channel-attachment__preview${fileType !== 'image' ? ' channel-attachment__icon' : ''}`}>
          {fileType === 'image' && <img alt={attachment.name} src={URL.createObjectURL(attachment)} />}
          {fileType === 'video' && <RawIcon src={VLCIC} />}
          {fileType === 'audio' && <RawIcon src={VolumeFullIC} />}
          {fileType !== 'image' && fileType !== 'video' && fileType !== 'audio' && <RawIcon src={FileIC} />}
        </div>
        <div className="channel-attachment__info">
          <Text variant="b1">{attachment.name}</Text>
          <Text variant="b3"><span ref={uploadProgressRef}>{`size: ${bytesToSize(attachment.size)}`}</span></Text>
        </div>
      </div>
    );
  }

  return (
    <>
      { attachment !== null && attachFile() }
      <form className="channel-input" onSubmit={(e) => { e.preventDefault(); }}>
        {
          roomTimeline.room.isSpaceRoom()
            ? <Text className="channel-input__space" variant="b1">Spaces are yet to be implemented</Text>
            : renderInputs()
        }
      </form>
    </>
  );
}
ChannelInput.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  timelineScroll: PropTypes.shape({
    reachBottom: PropTypes.func,
    autoReachBottom: PropTypes.func,
    tryRestoringScroll: PropTypes.func,
    enableSmoothScroll: PropTypes.func,
    disableSmoothScroll: PropTypes.func,
  }).isRequired,
};
function ChannelCmdBar({ roomId, roomTimeline }) {
  const [followingMembers, setFollowingMembers] = useState([]);
  const mx = initMatrix.matrixClient;

  function handleOnMessageSent() {
    setFollowingMembers([]);
  }

  function updateFollowingMembers() {
    const room = mx.getRoom(roomId);
    const { timeline } = room;
    const userIds = room.getUsersReadUpTo(timeline[timeline.length - 1]);
    const myUserId = mx.getUserId();
    setFollowingMembers(userIds.filter((userId) => userId !== myUserId));
  }

  useEffect(() => {
    updateFollowingMembers();
  }, [roomId]);

  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
    viewEvent.on('message_sent', handleOnMessageSent);
    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
      viewEvent.removeListener('message_sent', handleOnMessageSent);
    };
  }, [roomTimeline]);

  return (
    <div className="channel-cmd-bar">
      {
        followingMembers.length !== 0 && (
          <TimelineChange
            variant="follow"
            content={getUsersActionJsx(followingMembers, 'following the conversation.')}
            time=""
          />
        )
      }
    </div>
  );
}
ChannelCmdBar.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
};

let lastScrollTop = 0;
let lastScrollHeight = 0;
let isReachedBottom = true;
let isReachedTop = false;
function ChannelView({ roomId }) {
  const [roomTimeline, updateRoomTimeline] = useState(null);
  const timelineSVRef = useRef(null);

  useEffect(() => {
    roomTimeline?.removeInternalListeners();
    updateRoomTimeline(new RoomTimeline(roomId));
    isReachedBottom = true;
    isReachedTop = false;
  }, [roomId]);

  const timelineScroll = {
    reachBottom() {
      scrollToBottom(timelineSVRef);
    },
    autoReachBottom() {
      autoScrollToBottom(timelineSVRef);
    },
    tryRestoringScroll() {
      const sv = timelineSVRef.current;
      const { scrollHeight } = sv;

      if (lastScrollHeight === scrollHeight) return;

      if (lastScrollHeight < scrollHeight) {
        sv.scrollTop = lastScrollTop + (scrollHeight - lastScrollHeight);
      } else {
        timelineScroll.reachBottom();
      }
    },
    enableSmoothScroll() {
      timelineSVRef.current.style.scrollBehavior = 'smooth';
    },
    disableSmoothScroll() {
      timelineSVRef.current.style.scrollBehavior = 'auto';
    },
    isScrollable() {
      const oHeight = timelineSVRef.current.offsetHeight;
      const sHeight = timelineSVRef.current.scrollHeight;
      if (sHeight > oHeight) return true;
      return false;
    },
  };

  function onTimelineScroll(e) {
    const { scrollTop, scrollHeight, offsetHeight } = e.target;
    const scrollBottom = scrollTop + offsetHeight;
    lastScrollTop = scrollTop;
    lastScrollHeight = scrollHeight;

    const PLACEHOLDER_HEIGHT = 96;
    const PLACEHOLDER_COUNT = 3;

    const topPagKeyPoint = PLACEHOLDER_COUNT * PLACEHOLDER_HEIGHT;
    const bottomPagKeyPoint = scrollHeight - (offsetHeight / 2);

    if (!isReachedBottom && isAtBottom(timelineSVRef)) {
      isReachedBottom = true;
      viewEvent.emit('toggle-reached-bottom', true);
    }
    if (isReachedBottom && !isAtBottom(timelineSVRef)) {
      isReachedBottom = false;
      viewEvent.emit('toggle-reached-bottom', false);
    }
    // TOP of timeline
    if (scrollTop < topPagKeyPoint && isReachedTop === false) {
      isReachedTop = true;
      viewEvent.emit('reached-top');
      return;
    }
    isReachedTop = false;

    // BOTTOM of timeline
    if (scrollBottom > bottomPagKeyPoint) {
      // TODO:
    }
  }

  return (
    <div className="channel-view">
      <ChannelViewHeader roomId={roomId} />
      <div className="channel-view__content-wrapper">
        <div className="channel-view__scrollable">
          <ScrollView onScroll={onTimelineScroll} ref={timelineSVRef} autoHide>
            {roomTimeline !== null && (
              <ChannelViewContent
                roomId={roomId}
                roomTimeline={roomTimeline}
                timelineScroll={timelineScroll}
              />
            )}
          </ScrollView>
          {roomTimeline !== null && (
            <FloatingOptions
              roomId={roomId}
              roomTimeline={roomTimeline}
              timelineScroll={timelineScroll}
            />
          )}
        </div>
        {roomTimeline !== null && (
          <ChannelViewSticky>
            <ChannelInput
              roomId={roomId}
              roomTimeline={roomTimeline}
              timelineScroll={timelineScroll}
            />
            <ChannelCmdBar
              roomId={roomId}
              roomTimeline={roomTimeline}
            />
          </ChannelViewSticky>
        )}
      </div>
    </div>
  );
}
ChannelView.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default ChannelView;
