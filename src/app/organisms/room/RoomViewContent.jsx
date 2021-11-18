/* eslint-disable react/prop-types */
import React, { useState, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomViewContent.scss';

import dateFormat from 'dateformat';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { redactEvent, sendReaction } from '../../../client/action/roomTimeline';
import { getUsername, getUsernameOfRoomMember } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { diffMinutes, isNotInSameDay, getEventCords } from '../../../util/common';
import { openEmojiBoard, openProfileViewer, openReadReceipts } from '../../../client/action/navigation';

import Divider from '../../atoms/divider/Divider';
import Avatar from '../../atoms/avatar/Avatar';
import IconButton from '../../atoms/button/IconButton';
import ContextMenu, { MenuHeader, MenuItem, MenuBorder } from '../../atoms/context-menu/ContextMenu';
import {
  Message,
  MessageHeader,
  MessageReply,
  MessageContent,
  MessageEdit,
  MessageReactionGroup,
  MessageReaction,
  MessageOptions,
  PlaceholderMessage,
} from '../../molecules/message/Message';
import * as Media from '../../molecules/media/Media';
import RoomIntro from '../../molecules/room-intro/RoomIntro';
import TimelineChange from '../../molecules/message/TimelineChange';

import ReplyArrowIC from '../../../../public/res/ic/outlined/reply-arrow.svg';
import EmojiAddIC from '../../../../public/res/ic/outlined/emoji-add.svg';
import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';
import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';

import { parseReply, parseTimelineChange } from './common';

const MAX_MSG_DIFF_MINUTES = 5;

function genPlaceholders(key) {
  return (
    <React.Fragment key={`placeholder-container${key}`}>
      <PlaceholderMessage key={`placeholder-1${key}`} />
      <PlaceholderMessage key={`placeholder-2${key}`} />
    </React.Fragment>
  );
}

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

function genRoomIntro(mEvent, roomTimeline) {
  const mx = initMatrix.matrixClient;
  const roomTopic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;
  const isDM = initMatrix.roomList.directs.has(roomTimeline.roomId);
  let avatarSrc = roomTimeline.room.getAvatarUrl(mx.baseUrl, 80, 80, 'crop');
  avatarSrc = isDM ? roomTimeline.room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 80, 80, 'crop') : avatarSrc;
  return (
    <RoomIntro
      key={mEvent ? mEvent.getId() : 'room-intro'}
      roomId={roomTimeline.roomId}
      avatarSrc={avatarSrc}
      name={roomTimeline.room.name}
      heading={`Welcome to ${roomTimeline.room.name}`}
      desc={`This is the beginning of ${roomTimeline.room.name} room.${typeof roomTopic !== 'undefined' ? (` Topic: ${roomTopic}`) : ''}`}
      time={mEvent ? `Created at ${dateFormat(mEvent.getDate(), 'dd mmmm yyyy, hh:MM TT')}` : null}
    />
  );
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

const scroll = {
  from: 0,
  limit: 0,
  getEndIndex() {
    return (this.from + this.limit);
  },
  isNewEvent: false,
};
function RoomViewContent({
  roomId, roomTimeline, timelineScroll, viewEvent,
}) {
  const [isReachedTimelineEnd, setIsReachedTimelineEnd] = useState(false);
  const [onStateUpdate, updateState] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const mx = initMatrix.matrixClient;
  const noti = initMatrix.notifications;
  if (scroll.limit === 0) {
    const from = roomTimeline.timeline.size - timelineScroll.maxEvents;
    scroll.from = (from < 0) ? 0 : from;
    scroll.limit = timelineScroll.maxEvents;
  }

  function autoLoadTimeline() {
    if (timelineScroll.isScrollable === true) return;
    roomTimeline.paginateBack();
  }
  function trySendingReadReceipt() {
    const { timeline } = roomTimeline.room;
    if (
      (noti.doesRoomHaveUnread(roomTimeline.room) || noti.hasNoti(roomId))
      && timeline.length !== 0) {
      mx.sendReadReceipt(timeline[timeline.length - 1]);
    }
  }

  const getNewFrom = (position) => {
    let newFrom = scroll.from;
    const tSize = roomTimeline.timeline.size;
    const doPaginate = tSize > timelineScroll.maxEvents;
    if (!doPaginate || scroll.from < 0) newFrom = 0;
    const newEventCount = Math.round(timelineScroll.maxEvents / 2);
    scroll.limit = timelineScroll.maxEvents;

    if (position === 'TOP' && doPaginate) newFrom -= newEventCount;
    if (position === 'BOTTOM' && doPaginate) newFrom += newEventCount;

    if (newFrom >= tSize || scroll.getEndIndex() >= tSize) newFrom = tSize - scroll.limit - 1;
    if (newFrom < 0) newFrom = 0;
    return newFrom;
  };

  const handleTimelineScroll = (position) => {
    const tSize = roomTimeline.timeline.size;
    if (position === 'BETWEEN') return;
    if (position === 'BOTTOM' && scroll.getEndIndex() + 1 === tSize) return;

    if (scroll.from === 0 && position === 'TOP') {
      // Fetch back history.
      if (roomTimeline.isOngoingPagination || isReachedTimelineEnd) return;
      roomTimeline.paginateBack();
      return;
    }

    scroll.from = getNewFrom(position);
    updateState({});

    if (scroll.getEndIndex() + 1 >= tSize) {
      trySendingReadReceipt();
    }
  };

  const updatePAG = (canPagMore, loaded) => {
    if (canPagMore) {
      scroll.from += loaded;
      scroll.from = getNewFrom(timelineScroll.position);
      if (roomTimeline.ongoingDecryptionCount === 0) updateState({});
    } else setIsReachedTimelineEnd(true);
  };
  // force update RoomTimeline on cons.events.roomTimeline.EVENT
  const updateRT = () => {
    if (timelineScroll.position === 'BOTTOM') {
      trySendingReadReceipt();
      scroll.from = roomTimeline.timeline.size - scroll.limit - 1;
      if (scroll.from < 0) scroll.from = 0;
      scroll.isNewEvent = true;
    }
    updateState({});
  };

  const handleScrollToLive = () => {
    scroll.from = roomTimeline.timeline.size - scroll.limit - 1;
    if (scroll.from < 0) scroll.from = 0;
    scroll.isNewEvent = true;
    updateState({});
  };

  useEffect(() => {
    trySendingReadReceipt();
    return () => {
      setIsReachedTimelineEnd(false);
      scroll.limit = 0;
    };
  }, [roomId]);

  // init room setup completed.
  // listen for future. setup stateUpdate listener.
  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.EVENT, updateRT);
    roomTimeline.on(cons.events.roomTimeline.PAGINATED, updatePAG);
    viewEvent.on('timeline-scroll', handleTimelineScroll);
    viewEvent.on('scroll-to-live', handleScrollToLive);

    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.EVENT, updateRT);
      roomTimeline.removeListener(cons.events.roomTimeline.PAGINATED, updatePAG);
      viewEvent.removeListener('timeline-scroll', handleTimelineScroll);
      viewEvent.removeListener('scroll-to-live', handleScrollToLive);
    };
  }, [roomTimeline, isReachedTimelineEnd]);

  useLayoutEffect(() => {
    timelineScroll.reachBottom();
    autoLoadTimeline();
    trySendingReadReceipt();
  }, [roomTimeline]);

  useLayoutEffect(() => {
    if (onStateUpdate === null || scroll.isNewEvent) {
      scroll.isNewEvent = false;
      timelineScroll.reachBottom();
      return;
    }
    if (timelineScroll.isScrollable) {
      timelineScroll.tryRestoringScroll();
    } else {
      timelineScroll.reachBottom();
      autoLoadTimeline();
    }
  }, [onStateUpdate]);

  let prevMEvent = null;
  function genMessage(mEvent) {
    const myPowerlevel = roomTimeline.room.getMember(mx.getUserId())?.powerLevel;
    const canIRedact = roomTimeline.room.currentState.hasSufficientPowerLevelFor('redact', myPowerlevel);

    const isContentOnly = (
      prevMEvent !== null
      && prevMEvent.getType() !== 'm.room.member'
      && diffMinutes(mEvent.getDate(), prevMEvent.getDate()) <= MAX_MSG_DIFF_MINUTES
      && prevMEvent.getSender() === mEvent.getSender()
    );

    let content = mEvent.getContent().body;
    if (typeof content === 'undefined') return null;
    const msgType = mEvent.getContent()?.msgtype;
    let reply = null;
    let reactions = null;
    let isMarkdown = mEvent.getContent().format === 'org.matrix.custom.html';
    const isReply = typeof mEvent.getWireContent()['m.relates_to']?.['m.in_reply_to'] !== 'undefined';
    const isEdited = roomTimeline.editedTimeline.has(mEvent.getId());
    const haveReactions = roomTimeline.reactionTimeline.has(mEvent.getId());

    if (isReply) {
      const parsedContent = parseReply(content);
      if (parsedContent !== null) {
        const c = roomTimeline.room.currentState;
        const displayNameToUserIds = c.getUserIdsWithDisplayName(parsedContent.displayName);
        const ID = parsedContent.userId || displayNameToUserIds[0];
        reply = {
          color: colorMXID(ID || parsedContent.displayName),
          to: parsedContent.displayName || getUsername(parsedContent.userId),
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
              reactions[i].users.push(rEvent.getSender());
              if (reactions[i].isActive !== true) {
                const myUserId = initMatrix.matrixClient.getUserId();
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
            isActive: (rEvent.getSender() === initMatrix.matrixClient.getUserId()),
          });
        }
      });
    }

    const senderMXIDColor = colorMXID(mEvent.sender.userId);
    const userAvatar = isContentOnly ? null : (
      <button type="button" onClick={() => openProfileViewer(mEvent.sender.userId, roomId)}>
        <Avatar
          imageSrc={mEvent.sender.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop')}
          text={getUsernameOfRoomMember(mEvent.sender)}
          bgColor={senderMXIDColor}
          size="small"
        />
      </button>
    );
    const userHeader = isContentOnly ? null : (
      <MessageHeader
        userId={mEvent.sender.userId}
        name={getUsernameOfRoomMember(mEvent.sender)}
        color={senderMXIDColor}
        time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
      />
    );
    const userReply = reply === null ? null : (
      <MessageReply
        name={reply.to}
        color={reply.color}
        content={reply.content}
      />
    );
    const userContent = (
      <MessageContent
        senderName={getUsernameOfRoomMember(mEvent.sender)}
        isMarkdown={isMarkdown}
        content={isMedia(mEvent) ? genMediaContent(mEvent) : content}
        msgType={msgType}
        isEdited={isEdited}
      />
    );
    const userReactions = reactions === null ? null : (
      <MessageReactionGroup>
        {
          reactions.map((reaction) => (
            <MessageReaction
              key={reaction.id}
              reaction={reaction.key}
              users={reaction.users}
              isActive={reaction.isActive}
              onClick={() => {
                toggleEmoji(roomId, mEvent.getId(), reaction.key, roomTimeline);
              }}
            />
          ))
        }
        <IconButton
          onClick={(e) => pickEmoji(e, roomId, mEvent.getId(), roomTimeline)}
          src={EmojiAddIC}
          size="extra-small"
          tooltip="Add reaction"
        />
      </MessageReactionGroup>
    );
    const userOptions = (
      <MessageOptions>
        <IconButton
          onClick={(e) => pickEmoji(e, roomId, mEvent.getId(), roomTimeline)}
          src={EmojiAddIC}
          size="extra-small"
          tooltip="Add reaction"
        />
        <IconButton
          onClick={() => {
            viewEvent.emit('reply_to', mEvent.getSender(), mEvent.getId(), isMedia(mEvent) ? mEvent.getContent().body : content);
          }}
          src={ReplyArrowIC}
          size="extra-small"
          tooltip="Reply"
        />
        {(mEvent.getSender() === mx.getUserId() && !isMedia(mEvent)) && (
          <IconButton
            onClick={() => setEditEvent(mEvent)}
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
                iconSrc={EmojiAddIC}
                onClick={(e) => pickEmoji(e, roomId, mEvent.getId(), roomTimeline)}
              >
                Add reaction
              </MenuItem>
              <MenuItem
                iconSrc={ReplyArrowIC}
                onClick={() => {
                  viewEvent.emit('reply_to', mEvent.getSender(), mEvent.getId(), isMedia(mEvent) ? mEvent.getContent().body : content);
                }}
              >
                Reply
              </MenuItem>
              {(mEvent.getSender() === mx.getUserId() && !isMedia(mEvent)) && (
                <MenuItem iconSrc={PencilIC} onClick={() => setEditEvent(mEvent)}>Edit</MenuItem>
              )}
              <MenuItem
                iconSrc={TickMarkIC}
                onClick={() => openReadReceipts(roomId, mEvent.getId())}
              >
                Read receipts
              </MenuItem>
              {(canIRedact || mEvent.getSender() === mx.getUserId()) && (
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
      </MessageOptions>
    );

    const isEditingEvent = editEvent?.getId() === mEvent.getId();
    const myMessageEl = (
      <Message
        key={mEvent.getId()}
        avatar={userAvatar}
        header={userHeader}
        reply={userReply}
        content={editEvent !== null && isEditingEvent ? null : userContent}
        msgType={msgType}
        editContent={editEvent !== null && isEditingEvent ? (
          <MessageEdit
            content={content}
            onSave={(newBody) => {
              if (newBody !== content) {
                initMatrix.roomsInput.sendEditedMessage(roomId, mEvent, newBody);
              }
              setEditEvent(null);
            }}
            onCancel={() => setEditEvent(null)}
          />
        ) : null}
        reactions={userReactions}
        options={editEvent !== null && isEditingEvent ? null : userOptions}
      />
    );
    return myMessageEl;
  }

  function renderMessage(mEvent) {
    if (!cons.supportEventTypes.includes(mEvent.getType())) return false;
    if (mEvent.getRelation()?.rel_type === 'm.replace') return false;
    if (mEvent.isRedacted()) return false;

    if (mEvent.getType() === 'm.room.create') return genRoomIntro(mEvent, roomTimeline);

    let divider = null;
    if (prevMEvent !== null && isNotInSameDay(mEvent.getDate(), prevMEvent.getDate())) {
      divider = <Divider key={`divider-${mEvent.getId()}`} text={`${dateFormat(mEvent.getDate(), 'mmmm dd, yyyy')}`} />;
    }

    if (mEvent.getType() !== 'm.room.member') {
      const messageComp = genMessage(mEvent);
      prevMEvent = mEvent;
      return (
        <React.Fragment key={`box-${mEvent.getId()}`}>
          {divider}
          {messageComp}
        </React.Fragment>
      );
    }

    prevMEvent = mEvent;
    const timelineChange = parseTimelineChange(mEvent);
    if (timelineChange === null) return false;
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

  const renderTimeline = () => {
    const { timeline } = roomTimeline;
    const tl = [];
    if (timeline.size === 0) return tl;

    let i = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const [, mEvent] of timeline.entries()) {
      if (i >= scroll.from) {
        if (i === scroll.from) {
          if (mEvent.getType() !== 'm.room.create' && !isReachedTimelineEnd) tl.push(genPlaceholders(1));
          if (mEvent.getType() !== 'm.room.create' && isReachedTimelineEnd) tl.push(genRoomIntro(undefined, roomTimeline));
        }
        tl.push(renderMessage(mEvent));
      }
      i += 1;
      if (i > scroll.getEndIndex()) break;
    }
    if (i < timeline.size) tl.push(genPlaceholders(2));

    return tl;
  };

  return (
    <div className="room-view__content">
      <div className="timeline__wrapper">
        { renderTimeline() }
      </div>
    </div>
  );
}
RoomViewContent.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  timelineScroll: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewContent;
