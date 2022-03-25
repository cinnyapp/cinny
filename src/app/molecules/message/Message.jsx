/* eslint-disable react/prop-types */
import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import PropTypes from 'prop-types';
import './Message.scss';

import { getShortcodeToCustomEmoji } from '../../organisms/emoji-board/custom-emoji';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { getUsername, getUsernameOfRoomMember, parseReply } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { getEventCords } from '../../../util/common';
import { redactEvent, sendReaction } from '../../../client/action/roomTimeline';
import {
  openEmojiBoard, openProfileViewer, openReadReceipts, openViewSource, replyTo,
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
import CmdIC from '../../../../public/res/ic/outlined/cmd.svg';
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

const MessageAvatar = React.memo(({
  roomId, avatarSrc, userId, username,
}) => (
  <div className="message__avatar-container">
    <button type="button" onClick={() => openProfileViewer(userId, roomId)}>
      <Avatar imageSrc={avatarSrc} text={username} bgColor={colorMXID(userId)} size="small" />
    </button>
  </div>
));

const MessageHeader = React.memo(({
  userId, username, time,
}) => (
  <div className="message__header">
    <Text
      style={{ color: colorMXID(userId) }}
      className="message__profile"
      variant="b1"
      weight="medium"
      span
    >
      <span>{twemojify(username)}</span>
      <span>{twemojify(userId)}</span>
    </Text>
    <div className="message__time">
      <Text variant="b3">{time}</Text>
    </div>
  </div>
));
MessageHeader.propTypes = {
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
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

const MessageReplyWrapper = React.memo(({ roomTimeline, eventId }) => {
  const [reply, setReply] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const mx = initMatrix.matrixClient;
    const timelineSet = roomTimeline.getUnfilteredTimelineSet();
    const loadReply = async () => {
      try {
        const eTimeline = await mx.getEventTimeline(timelineSet, eventId);
        await roomTimeline.decryptAllEventsOfTimeline(eTimeline);

        const mEvent = eTimeline.getTimelineSet().findEventById(eventId);

        const rawBody = mEvent.getContent().body;
        const username = getUsernameOfRoomMember(mEvent.sender);

        if (isMountedRef.current === false) return;
        const fallbackBody = mEvent.isRedacted() ? '*** This message has been deleted ***' : '*** Unable to load reply ***';
        setReply({
          to: username,
          color: colorMXID(mEvent.getSender()),
          body: parseReply(rawBody)?.body ?? rawBody ?? fallbackBody,
          event: mEvent,
        });
      } catch {
        setReply({
          to: '** Unknown user **',
          color: 'var(--tc-danger-normal)',
          body: '*** Unable to load reply ***',
          event: null,
        });
      }
    };
    loadReply();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const focusReply = (ev) => {
    if (!ev.keyCode || ev.keyCode === 32 || ev.keyCode === 13) {
      if (ev.keyCode) ev.preventDefault();
      if (reply?.event === null) return;
      if (reply?.event.isRedacted()) return;
      roomTimeline.loadEventTimeline(eventId);
    }
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
});
MessageReplyWrapper.propTypes = {
  roomTimeline: PropTypes.shape({}).isRequired,
  eventId: PropTypes.string.isRequired,
};

const MessageBody = React.memo(({
  senderName,
  body,
  isCustomHTML,
  isEdited,
  msgType,
}) => {
  // if body is not string it is a React element.
  if (typeof body !== 'string') return <div className="message__body">{body}</div>;

  let content = null;
  if (isCustomHTML) {
    try {
      content = twemojify(sanitizeCustomHtml(body), undefined, true, false);
    } catch {
      console.error('Malformed custom html: ', body);
      content = twemojify(body, undefined);
    }
  } else {
    content = twemojify(body, undefined, true);
  }

  // Determine if this message should render with large emojis
  // Criteria:
  // - Contains only emoji
  // - Contains no more than 10 emoji
  let emojiOnly = false;
  if (content.type === 'img') {
    // If this messages contains only a single (inline) image
    emojiOnly = true;
  } else if (content.constructor.name === 'Array') {
    // Otherwise, it might be an array of images / texb

    // Count the number of emojis
    const nEmojis = content.filter((e) => e.type === 'img').length;

    // Make sure there's no text besides whitespace and variation selector U+FE0F
    if (nEmojis <= 10 && content.every((element) => (
      (typeof element === 'object' && element.type === 'img')
      || (typeof element === 'string' && /^[\s\ufe0f]*$/g.test(element))
    ))) {
      emojiOnly = true;
    }
  }

  if (!isCustomHTML) {
    // If this is a plaintext message, wrap it in a <p> element (automatically applying
    // white-space: pre-wrap) in order to preserve newlines
    content = (<p>{content}</p>);
  }

  return (
    <div className="message__body">
      <div className={`text ${emojiOnly ? 'text-h1' : 'text-b1'}`}>
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
});
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

  useEffect(() => {
    // makes the cursor end up at the end of the line instead of the beginning
    editInputRef.current.value = '';
    editInputRef.current.value = body;
  }, []);

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
        autoFocus
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

function getMyEmojiEvent(emojiKey, eventId, roomTimeline) {
  const mx = initMatrix.matrixClient;
  const rEvents = roomTimeline.reactionTimeline.get(eventId);
  let rEvent = null;
  rEvents?.find((rE) => {
    if (rE.getRelation() === null) return false;
    if (rE.getRelation().key === emojiKey && rE.getSender() === mx.getUserId()) {
      rEvent = rE;
      return true;
    }
    return false;
  });
  return rEvent;
}

function toggleEmoji(roomId, eventId, emojiKey, roomTimeline) {
  const myAlreadyReactEvent = getMyEmojiEvent(emojiKey, eventId, roomTimeline);
  if (myAlreadyReactEvent) {
    const rId = myAlreadyReactEvent.getId();
    if (rId.startsWith('~')) return;
    redactEvent(roomId, rId);
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

function genReactionMsg(userIds, reaction) {
  return (
    <>
      {userIds.map((userId, index) => (
        <React.Fragment key={userId}>
          {twemojify(getUsername(userId))}
          {index < userIds.length - 1 && (
            <span style={{ opacity: '.6' }}>
              {index === userIds.length - 2 ? ' and ' : ', '}
            </span>
          )}
        </React.Fragment>
      ))}
      <span style={{ opacity: '.6' }}>{' reacted with '}</span>
      {twemojify(reaction, { className: 'react-emoji' })}
    </>
  );
}

function MessageReaction({
  shortcodeToEmoji, reaction, count, users, isActive, onClick,
}) {
  const customEmojiMatch = reaction.match(/^:(\S+):$/);
  let customEmojiUrl = null;
  if (customEmojiMatch) {
    const customEmoji = shortcodeToEmoji.get(customEmojiMatch[1]);
    customEmojiUrl = initMatrix.matrixClient.mxcUrlToHttp(customEmoji?.mxc);
  }
  return (
    <Tooltip
      className="msg__reaction-tooltip"
      content={<Text variant="b2">{users.length > 0 ? genReactionMsg(users, reaction) : 'Unable to load who has reacted'}</Text>}
    >
      <button
        onClick={onClick}
        type="button"
        className={`msg__reaction${isActive ? ' msg__reaction--active' : ''}`}
      >
        {
          customEmojiUrl
            ? <img className="react-emoji" draggable="false" alt={reaction} src={customEmojiUrl} />
            : twemojify(reaction, { className: 'react-emoji' })
        }
        <Text variant="b3" className="msg__reaction-count">{count}</Text>
      </button>
    </Tooltip>
  );
}
MessageReaction.propTypes = {
  shortcodeToEmoji: PropTypes.shape({}).isRequired,
  reaction: PropTypes.node.isRequired,
  count: PropTypes.number.isRequired,
  users: PropTypes.arrayOf(PropTypes.string).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

function MessageReactionGroup({ roomTimeline, mEvent }) {
  const { roomId, room, reactionTimeline } = roomTimeline;
  const mx = initMatrix.matrixClient;
  const reactions = {};
  const shortcodeToEmoji = getShortcodeToCustomEmoji(room);
  const canSendReaction = room.currentState.maySendEvent('m.reaction', mx.getUserId());

  const eventReactions = reactionTimeline.get(mEvent.getId());
  const addReaction = (key, count, senderId, isActive) => {
    let reaction = reactions[key];
    if (reaction === undefined) {
      reaction = {
        count: 0,
        users: [],
        isActive: false,
      };
    }
    if (count) {
      reaction.count = count;
    } else {
      reaction.users.push(senderId);
      reaction.count = reaction.users.length;
      if (isActive) reaction.isActive = isActive;
    }

    reactions[key] = reaction;
  };
  if (eventReactions) {
    eventReactions.forEach((rEvent) => {
      if (rEvent.getRelation() === null) return;
      const reaction = rEvent.getRelation();
      const senderId = rEvent.getSender();
      const isActive = senderId === mx.getUserId();

      addReaction(reaction.key, undefined, senderId, isActive);
    });
  } else {
    // Use aggregated reactions
    const aggregatedReaction = mEvent.getServerAggregatedRelation('m.annotation')?.chunk;
    if (!aggregatedReaction) return null;
    aggregatedReaction.forEach((reaction) => {
      if (reaction.type !== 'm.reaction') return;
      addReaction(reaction.key, reaction.count, undefined, false);
    });
  }

  return (
    <div className="message__reactions text text-b3 noselect">
      {
        Object.keys(reactions).map((key) => (
          <MessageReaction
            key={key}
            shortcodeToEmoji={shortcodeToEmoji}
            reaction={key}
            count={reactions[key].count}
            users={reactions[key].users}
            isActive={reactions[key].isActive}
            onClick={() => {
              toggleEmoji(roomId, mEvent.getId(), key, roomTimeline);
            }}
          />
        ))
      }
      {canSendReaction && (
        <IconButton
          onClick={(e) => {
            pickEmoji(e, roomId, mEvent.getId(), roomTimeline);
          }}
          src={EmojiAddIC}
          size="extra-small"
          tooltip="Add reaction"
        />
      )}
    </div>
  );
}
MessageReactionGroup.propTypes = {
  roomTimeline: PropTypes.shape({}).isRequired,
  mEvent: PropTypes.shape({}).isRequired,
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

// if editedTimeline has mEventId then pass editedMEvent else pass mEvent to openViewSource
function handleOpenViewSource(mEvent, roomTimeline) {
  const eventId = mEvent.getId();
  const { editedTimeline } = roomTimeline ?? {};
  let editedMEvent;
  if (editedTimeline?.has(eventId)) {
    const editedList = editedTimeline.get(eventId);
    editedMEvent = editedList[editedList.length - 1];
  }
  openViewSource(editedMEvent !== undefined ? editedMEvent : mEvent);
}

const MessageOptions = React.memo(({
  roomTimeline, mEvent, edit, reply,
}) => {
  const { roomId, room } = roomTimeline;
  const mx = initMatrix.matrixClient;
  const senderId = mEvent.getSender();

  const myPowerlevel = room.getMember(mx.getUserId())?.powerLevel;
  const canIRedact = room.currentState.hasSufficientPowerLevelFor('redact', myPowerlevel);
  const canSendReaction = room.currentState.maySendEvent('m.reaction', mx.getUserId());

  return (
    <div className="message__options">
      {canSendReaction && (
        <IconButton
          onClick={(e) => pickEmoji(e, roomId, mEvent.getId(), roomTimeline)}
          src={EmojiAddIC}
          size="extra-small"
          tooltip="Add reaction"
        />
      )}
      <IconButton
        onClick={() => reply()}
        src={ReplyArrowIC}
        size="extra-small"
        tooltip="Reply"
      />
      {(senderId === mx.getUserId() && !isMedia(mEvent)) && (
        <IconButton
          onClick={() => edit(true)}
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
              onClick={() => openReadReceipts(roomId, roomTimeline.getEventReaders(mEvent))}
            >
              Read receipts
            </MenuItem>
            <MenuItem
              iconSrc={CmdIC}
              onClick={() => handleOpenViewSource(mEvent, roomTimeline)}
            >
              View source
            </MenuItem>
            {(canIRedact || senderId === mx.getUserId()) && (
              <>
                <MenuBorder />
                <MenuItem
                  variant="danger"
                  iconSrc={BinIC}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this event')) {
                      redactEvent(roomId, mEvent.getId());
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
    </div>
  );
});
MessageOptions.propTypes = {
  roomTimeline: PropTypes.shape({}).isRequired,
  mEvent: PropTypes.shape({}).isRequired,
  edit: PropTypes.func.isRequired,
  reply: PropTypes.func.isRequired,
};

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
  mEvent, isBodyOnly, roomTimeline, focus, time,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const roomId = mEvent.getRoomId();
  const { editedTimeline, reactionTimeline } = roomTimeline ?? {};

  const className = ['message', (isBodyOnly ? 'message--body-only' : 'message--full')];
  if (focus) className.push('message--focus');
  const content = mEvent.getContent();
  const eventId = mEvent.getId();
  const msgType = content?.msgtype;
  const senderId = mEvent.getSender();
  let { body } = content;
  const username = mEvent.sender ? getUsernameOfRoomMember(mEvent.sender) : getUsername(senderId);
  const avatarSrc = mEvent.sender?.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop') ?? null;

  const edit = useCallback(() => {
    setIsEditing(true);
  }, []);
  const reply = useCallback(() => {
    replyTo(senderId, mEvent.getId(), body);
  }, [body]);

  if (body === undefined) return null;
  if (msgType === 'm.emote') className.push('message--type-emote');

  let isCustomHTML = content.format === 'org.matrix.custom.html';
  const isEdited = roomTimeline ? editedTimeline.has(eventId) : false;
  const haveReactions = roomTimeline
    ? reactionTimeline.has(eventId) || !!mEvent.getServerAggregatedRelation('m.annotation')
    : false;
  const isReply = !!mEvent.replyEventId;
  let customHTML = isCustomHTML ? content.formatted_body : null;

  if (isEdited) {
    const editedList = editedTimeline.get(eventId);
    const editedMEvent = editedList[editedList.length - 1];
    [body, isCustomHTML, customHTML] = getEditedBody(editedMEvent);
    if (typeof body !== 'string') return null;
  }

  if (isReply) {
    body = parseReply(body)?.body ?? body;
  }

  return (
    <div className={className.join(' ')}>
      {
        isBodyOnly
          ? <div className="message__avatar-container" />
          : (
            <MessageAvatar
              roomId={roomId}
              avatarSrc={avatarSrc}
              userId={senderId}
              username={username}
            />
          )
      }
      <div className="message__main-container">
        {!isBodyOnly && (
          <MessageHeader userId={senderId} username={username} time={time} />
        )}
        {roomTimeline && isReply && (
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
          <MessageReactionGroup roomTimeline={roomTimeline} mEvent={mEvent} />
        )}
        {roomTimeline && !isEditing && (
          <MessageOptions
            roomTimeline={roomTimeline}
            mEvent={mEvent}
            edit={edit}
            reply={reply}
          />
        )}
      </div>
    </div>
  );
}
Message.defaultProps = {
  isBodyOnly: false,
  focus: false,
  roomTimeline: null,
};
Message.propTypes = {
  mEvent: PropTypes.shape({}).isRequired,
  isBodyOnly: PropTypes.bool,
  roomTimeline: PropTypes.shape({}),
  focus: PropTypes.bool,
  time: PropTypes.string.isRequired,
};

export { Message, MessageReply, PlaceholderMessage };
