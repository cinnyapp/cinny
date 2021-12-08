/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './Message.scss';

import dateFormat from 'dateformat';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { getUsername, getUsernameOfRoomMember, parseReply } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { getEventCords } from '../../../util/common';
import { redactEvent, sendReaction } from '../../../client/action/roomTimeline';
import {
  openEmojiBoard, openProfileViewer, openReadReceipts, replyTo,
} from '../../../client/action/navigation';
import { sanitizeCustomHtml } from '../../../util/sanitize';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Button from '../../atoms/button/Button';
import Tooltip from '../../atoms/tooltip/Tooltip';
import Input from '../../atoms/input/Input';
import Avatar from '../../atoms/avatar/Avatar';
import IconButton from '../../atoms/button/IconButton';
import ContextMenu, { MenuHeader, MenuItem, MenuBorder } from '../../atoms/context-menu/ContextMenu';
import * as Media from '../media/Media';

import ReplyArrowIC from '../../../../public/res/ic/outlined/reply-arrow.svg';
import EmojiAddIC from '../../../../public/res/ic/outlined/emoji-add.svg';
import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';
import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';

function PlaceholderMessage() {
  return (
    <div className="ph-msg">
      <div className="ph-msg__avatar-container">
        <div className="ph-msg__avatar" />
      </div>
      <div className="ph-msg__main-container">
        <div className="ph-msg__header" />
        <div className="ph-msg__body">
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
    </div>
  );
}

function MessageHeader({
  userId, name, color, time,
}) {
  return (
    <div className="message__header">
      <div style={{ color }} className="message__profile">
        <Text variant="b1">{twemojify(name)}</Text>
        <Text variant="b1">{twemojify(userId)}</Text>
      </div>
      <div className="message__time">
        <Text variant="b3">{time}</Text>
      </div>
    </div>
  );
}
MessageHeader.propTypes = {
  userId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
};

function MessageReply({ name, color, body }) {
  return (
    <div className="message__reply">
      <Text variant="b2">
        <RawIcon color={color} size="extra-small" src={ReplyArrowIC} />
        <span style={{ color }}>{twemojify(name)}</span>
        {' '}
        {twemojify(body)}
      </Text>
    </div>
  );
}

MessageReply.propTypes = {
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
};

function MessageReplyWrapper({ roomTimeline, eventId }) {
  const [reply, setReply] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const mx = initMatrix.matrixClient;
    const timelineSet = roomTimeline.getUnfilteredTimelineSet();
    const loadReply = async () => {
      const eTimeline = await mx.getEventTimeline(timelineSet, eventId);
      await roomTimeline.decryptAllEventsOfTimeline(eTimeline);

      const mEvent = eTimeline.getTimelineSet().findEventById(eventId);

      const rawBody = mEvent.getContent().body;
      const username = getUsernameOfRoomMember(mEvent.sender);

      if (isMountedRef.current === false) return;
      const fallbackBody = mEvent.isRedacted() ? '*** This message has been deleted ***' : '*** Unable to load reply content ***';
      setReply({
        to: username,
        color: colorMXID(mEvent.getSender()),
        body: parseReply(rawBody)?.body ?? rawBody ?? fallbackBody,
        event: mEvent,
      });
    };
    loadReply();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const focusReply = () => {
    if (reply?.event.isRedacted()) return;
    roomTimeline.loadEventTimeline(eventId);
  };

  return (
    <div
      className="message__reply-wrapper"
      onClick={focusReply}
      onKeyDown={focusReply}
      role="button"
      tabIndex="0"
    >
      {reply !== null && <MessageReply name={reply.to} color={reply.color} body={reply.body} />}
    </div>
  );
}
MessageReplyWrapper.propTypes = {
  roomTimeline: PropTypes.shape({}).isRequired,
  eventId: PropTypes.string.isRequired,
};

function MessageBody({
  senderName,
  body,
  isCustomHTML,
  isEdited,
  msgType,
}) {
  // if body is not string it is a React element.
  if (typeof body !== 'string') return <div className="message__body">{body}</div>;

  const content = isCustomHTML
    ? twemojify(sanitizeCustomHtml(body), undefined, true, false)
    : twemojify(body, undefined, true);

  return (
    <div className="message__body">
      <div className="text text-b1">
        { msgType === 'm.emote' && (
          <>
            {'* '}
            {twemojify(senderName)}
            {' '}
          </>
        )}
        { content }
      </div>
      { isEdited && <Text className="message__body-edited" variant="b3">(edited)</Text>}
    </div>
  );
}
MessageBody.defaultProps = {
  isCustomHTML: false,
  isEdited: false,
  msgType: null,
};
MessageBody.propTypes = {
  senderName: PropTypes.string.isRequired,
  body: PropTypes.node.isRequired,
  isCustomHTML: PropTypes.bool,
  isEdited: PropTypes.bool,
  msgType: PropTypes.string,
};

function MessageEdit({ body, onSave, onCancel }) {
  const editInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault();
      onSave(editInputRef.current.value);
    }
  };

  return (
    <form className="message__edit" onSubmit={(e) => { e.preventDefault(); onSave(editInputRef.current.value); }}>
      <Input
        forwardRef={editInputRef}
        onKeyDown={handleKeyDown}
        value={body}
        placeholder="Edit message"
        required
        resizable
      />
      <div className="message__edit-btns">
        <Button type="submit" variant="primary">Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
MessageEdit.propTypes = {
  body: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function MessageReactionGroup({ children }) {
  return (
    <div className="message__reactions text text-b3 noselect">
      { children }
    </div>
  );
}
MessageReactionGroup.propTypes = {
  children: PropTypes.node.isRequired,
};

function genReactionMsg(userIds, reaction) {
  const genLessContText = (text) => <span style={{ opacity: '.6' }}>{text}</span>;
  let msg = <></>;
  userIds.forEach((userId, index) => {
    if (index === 0) msg = <>{getUsername(userId)}</>;
    // eslint-disable-next-line react/jsx-one-expression-per-line
    else if (index === userIds.length - 1) msg = <>{msg}{genLessContText(' and ')}{getUsername(userId)}</>;
    // eslint-disable-next-line react/jsx-one-expression-per-line
    else msg = <>{msg}{genLessContText(', ')}{getUsername(userId)}</>;
  });
  return (
    <>
      {msg}
      {genLessContText(' reacted with')}
      {twemojify(reaction, { className: 'react-emoji' })}
    </>
  );
}

function MessageReaction({
  reaction, users, isActive, onClick,
}) {
  return (
    <Tooltip
      className="msg__reaction-tooltip"
      content={<Text variant="b2">{genReactionMsg(users, reaction)}</Text>}
    >
      <button
        onClick={onClick}
        type="button"
        className={`msg__reaction${isActive ? ' msg__reaction--active' : ''}`}
      >
        { twemojify(reaction, { className: 'react-emoji' }) }
        <Text variant="b3" className="msg__reaction-count">{users.length}</Text>
      </button>
    </Tooltip>
  );
}
MessageReaction.propTypes = {
  reaction: PropTypes.node.isRequired,
  users: PropTypes.arrayOf(PropTypes.string).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

function MessageOptions({ children }) {
  return (
    <div className="message__options">
      {children}
    </div>
  );
}
MessageOptions.propTypes = {
  children: PropTypes.node.isRequired,
};

function isMedia(mE) {
  return (
    mE.getContent()?.msgtype === 'm.file'
    || mE.getContent()?.msgtype === 'm.image'
    || mE.getContent()?.msgtype === 'm.audio'
    || mE.getContent()?.msgtype === 'm.video'
    || mE.getType() === 'm.sticker'
  );
}

function genMediaContent(mE) {
  const mx = initMatrix.matrixClient;
  const mContent = mE.getContent();
  if (!mContent || !mContent.body) return <span style={{ color: 'var(--bg-danger)' }}>Malformed event</span>;

  let mediaMXC = mContent?.url;
  const isEncryptedFile = typeof mediaMXC === 'undefined';
  if (isEncryptedFile) mediaMXC = mContent?.file?.url;

  let thumbnailMXC = mContent?.info?.thumbnail_url;

  if (typeof mediaMXC === 'undefined' || mediaMXC === '') return <span style={{ color: 'var(--bg-danger)' }}>Malformed event</span>;

  let msgType = mE.getContent()?.msgtype;
  if (mE.getType() === 'm.sticker') msgType = 'm.image';

  switch (msgType) {
    case 'm.file':
      return (
        <Media.File
          name={mContent.body}
          link={mx.mxcUrlToHttp(mediaMXC)}
          type={mContent.info?.mimetype}
          file={mContent.file || null}
        />
      );
    case 'm.image':
      return (
        <Media.Image
          name={mContent.body}
          width={typeof mContent.info?.w === 'number' ? mContent.info?.w : null}
          height={typeof mContent.info?.h === 'number' ? mContent.info?.h : null}
          link={mx.mxcUrlToHttp(mediaMXC)}
          file={isEncryptedFile ? mContent.file : null}
          type={mContent.info?.mimetype}
        />
      );
    case 'm.audio':
      return (
        <Media.Audio
          name={mContent.body}
          link={mx.mxcUrlToHttp(mediaMXC)}
          type={mContent.info?.mimetype}
          file={mContent.file || null}
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
          thumbnailFile={isEncryptedFile ? mContent.info?.thumbnail_file : null}
          thumbnailType={mContent.info?.thumbnail_info?.mimetype || null}
          width={typeof mContent.info?.w === 'number' ? mContent.info?.w : null}
          height={typeof mContent.info?.h === 'number' ? mContent.info?.h : null}
          file={isEncryptedFile ? mContent.file : null}
          type={mContent.info?.mimetype}
        />
      );
    default:
      return <span style={{ color: 'var(--bg-danger)' }}>Malformed event</span>;
  }
}
function getMyEmojiEventId(emojiKey, eventId, roomTimeline) {
  const mx = initMatrix.matrixClient;
  const rEvents = roomTimeline.reactionTimeline.get(eventId);
  let rEventId = null;
  rEvents?.find((rE) => {
    if (rE.getRelation() === null) return false;
    if (rE.getRelation().key === emojiKey && rE.getSender() === mx.getUserId()) {
      rEventId = rE.getId();
      return true;
    }
    return false;
  });
  return rEventId;
}

function toggleEmoji(roomId, eventId, emojiKey, roomTimeline) {
  const myAlreadyReactEventId = getMyEmojiEventId(emojiKey, eventId, roomTimeline);
  if (typeof myAlreadyReactEventId === 'string') {
    if (myAlreadyReactEventId.indexOf('~') === 0) return;
    redactEvent(roomId, myAlreadyReactEventId);
    return;
  }
  sendReaction(roomId, eventId, emojiKey);
}

function pickEmoji(e, roomId, eventId, roomTimeline) {
  openEmojiBoard(getEventCords(e), (emoji) => {
    toggleEmoji(roomId, eventId, emoji.unicode, roomTimeline);
    e.target.click();
  });
}

function getEditedBody(editedMEvent) {
  const newContent = editedMEvent.getContent()['m.new_content'];
  if (typeof newContent === 'undefined') return [null, false, null];

  const isCustomHTML = newContent.format === 'org.matrix.custom.html';
  const parsedContent = parseReply(newContent.body);
  if (parsedContent === null) {
    return [newContent.body, isCustomHTML, newContent.formatted_body ?? null];
  }
  return [parsedContent.body, isCustomHTML, newContent.formatted_body ?? null];
}

function Message({
  mEvent, isBodyOnly, roomTimeline, focus, time
}) {
  const [isEditing, setIsEditing] = useState(false);

  const mx = initMatrix.matrixClient;
  const {
    room, roomId, editedTimeline, reactionTimeline,
  } = roomTimeline;

  const className = ['message', (isBodyOnly ? 'message--body-only' : 'message--full')];
  if (focus) className.push('message--focus');
  const content = mEvent.getContent();
  const eventId = mEvent.getId();
  const msgType = content?.msgtype;
  const senderId = mEvent.getSender();
  const mxidColor = colorMXID(senderId);
  let { body } = content;
  const avatarSrc = mEvent.sender.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop');
  const username = getUsernameOfRoomMember(mEvent.sender);

  if (typeof body === 'undefined') return null;
  if (msgType === 'm.emote') className.push('message--type-emote');

  const myPowerlevel = room.getMember(mx.getUserId())?.powerLevel;
  const canIRedact = room.currentState.hasSufficientPowerLevelFor('redact', myPowerlevel);

  let [reactions, isCustomHTML] = [null, content.format === 'org.matrix.custom.html'];
  const [isEdited, haveReactions] = [editedTimeline.has(eventId), reactionTimeline.has(eventId)];
  const isReply = !!mEvent.replyEventId;
  let customHTML = isCustomHTML ? content.formatted_body : null;

  if (isEdited) {
    const editedList = editedTimeline.get(eventId);
    const editedMEvent = editedList[editedList.length - 1];
    [body, isCustomHTML, customHTML] = getEditedBody(editedMEvent);
    if (typeof body !== 'string') return null;
  }

  if (haveReactions) {
    reactions = [];
    reactionTimeline.get(eventId).forEach((rEvent) => {
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
            reactions[i].users.push(rEvent.getSender());
            if (reactions[i].isActive !== true) {
              const myUserId = mx.getUserId();
              reactions[i].isActive = rEvent.getSender() === myUserId;
              if (reactions[i].isActive) reactions[i].id = rEvent.getId();
            }
            break;
          }
        }
      } else {
        reactions.push({
          id: rEvent.getId(),
          key: rEvent.getRelation().key,
          users: [rEvent.getSender()],
          isActive: (rEvent.getSender() === mx.getUserId()),
        });
      }
    });
  }

  if (isReply) {
    body = parseReply(body)?.body ?? body;
  }

  return (
    <div className={className.join(' ')}>
      <div className="message__avatar-container">
        {!isBodyOnly && (
          <button type="button" onClick={() => openProfileViewer(senderId, roomId)}>
            <Avatar imageSrc={avatarSrc} text={username} bgColor={mxidColor} size="small" />
          </button>
        )}
      </div>
      <div className="message__main-container">
        {!isBodyOnly && (
          <MessageHeader userId={senderId} name={username} color={mxidColor} time={time} />
        )}
        {isReply && (
          <MessageReplyWrapper
            roomTimeline={roomTimeline}
            eventId={mEvent.replyEventId}
          />
        )}
        {!isEditing && (
          <MessageBody
            senderName={username}
            isCustomHTML={isCustomHTML}
            body={isMedia(mEvent) ? genMediaContent(mEvent) : customHTML ?? body}
            msgType={msgType}
            isEdited={isEdited}
          />
        )}
        {isEditing && (
          <MessageEdit
            body={body}
            onSave={(newBody) => {
              if (newBody !== body) {
                initMatrix.roomsInput.sendEditedMessage(roomId, mEvent, newBody);
              }
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
        {haveReactions && (
          <MessageReactionGroup>
            {
              reactions.map((reaction) => (
                <MessageReaction
                  key={reaction.id}
                  reaction={reaction.key}
                  users={reaction.users}
                  isActive={reaction.isActive}
                  onClick={() => {
                    toggleEmoji(roomId, eventId, reaction.key, roomTimeline);
                  }}
                />
              ))
            }
            <IconButton
              onClick={(e) => {
                pickEmoji(e, roomId, eventId, roomTimeline);
              }}
              src={EmojiAddIC}
              size="extra-small"
              tooltip="Add reaction"
            />
          </MessageReactionGroup>
        )}
        {!isEditing && (
          <MessageOptions>
            <IconButton
              onClick={(e) => pickEmoji(e, roomId, eventId, roomTimeline)}
              src={EmojiAddIC}
              size="extra-small"
              tooltip="Add reaction"
            />
            <IconButton
              onClick={() => replyTo(senderId, eventId, body)}
              src={ReplyArrowIC}
              size="extra-small"
              tooltip="Reply"
            />
            {(senderId === mx.getUserId() && !isMedia(mEvent)) && (
              <IconButton
                onClick={() => setIsEditing(true)}
                src={PencilIC}
                size="extra-small"
                tooltip="Edit"
              />
            )}
            <ContextMenu
              content={() => (
                <>
                  <MenuHeader>Options</MenuHeader>
                  <MenuItem
                    iconSrc={TickMarkIC}
                    onClick={() => openReadReceipts(roomId, roomTimeline.getEventReaders(eventId))}
                  >
                    Read receipts
                  </MenuItem>
                  {(canIRedact || senderId === mx.getUserId()) && (
                    <>
                      <MenuBorder />
                      <MenuItem
                        variant="danger"
                        iconSrc={BinIC}
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this event')) {
                            redactEvent(roomId, eventId);
                          }
                        }}
                      >
                        Delete
                      </MenuItem>
                    </>
                  )}
                </>
              )}
              render={(toggleMenu) => (
                <IconButton
                  onClick={toggleMenu}
                  src={VerticalMenuIC}
                  size="extra-small"
                  tooltip="Options"
                />
              )}
            />
          </MessageOptions>
        )}
      </div>
    </div>
  );
}
Message.defaultProps = {
  isBodyOnly: false,
  focus: false,
};
Message.propTypes = {
  mEvent: PropTypes.shape({}).isRequired,
  isBodyOnly: PropTypes.bool,
  roomTimeline: PropTypes.shape({}).isRequired,
  focus: PropTypes.bool,
  time: PropTypes.string.isRequired,
};

export { Message, MessageReply, PlaceholderMessage };
