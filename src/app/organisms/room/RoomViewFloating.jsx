/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomViewFloating.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';

import { getUsersActionJsx } from './common';

function useJumpToEvent(roomTimeline) {
  const [eventId, setEventId] = useState(null);

  const jumpToEvent = () => {
    roomTimeline.loadEventTimeline(eventId);
  };

  const cancelJumpToEvent = () => {
    roomTimeline.markAllAsRead();
    setEventId(null);
  };

  useEffect(() => {
    const readEventId = roomTimeline.getReadUpToEventId();
    // we only show "Jump to unread" btn only if the event is not in timeline.
    // if event is in timeline
    // we will automatically open the timeline from that event position
    if (!readEventId?.startsWith('~') && !roomTimeline.hasEventInTimeline(readEventId)) {
      setEventId(readEventId);
    }

    const handleMarkAsRead = () => setEventId(null);
    roomTimeline.on(cons.events.roomTimeline.MARKED_AS_READ, handleMarkAsRead);

    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.MARKED_AS_READ, handleMarkAsRead);
      setEventId(null);
    };
  }, [roomTimeline]);

  return [!!eventId, jumpToEvent, cancelJumpToEvent];
}

function useTypingMembers(roomTimeline) {
  const [typingMembers, setTypingMembers] = useState(new Set());

  const updateTyping = (members) => {
    const mx = initMatrix.matrixClient;
    members.delete(mx.getUserId());
    setTypingMembers(members);
  };

  useEffect(() => {
    setTypingMembers(new Set());
    roomTimeline.on(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, updateTyping);
    return () => {
      roomTimeline?.removeListener(cons.events.roomTimeline.TYPING_MEMBERS_UPDATED, updateTyping);
    };
  }, [roomTimeline]);

  return [typingMembers];
}

function useScrollToBottom(roomTimeline) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const handleAtBottom = (atBottom) => setIsAtBottom(atBottom);

  useEffect(() => {
    setIsAtBottom(true);
    roomTimeline.on(cons.events.roomTimeline.AT_BOTTOM, handleAtBottom);
    return () => roomTimeline.removeListener(cons.events.roomTimeline.AT_BOTTOM, handleAtBottom);
  }, [roomTimeline]);

  return [isAtBottom, setIsAtBottom];
}

function RoomViewFloating({
  roomId, roomTimeline,
}) {
  const [isJumpToEvent, jumpToEvent, cancelJumpToEvent] = useJumpToEvent(roomTimeline);
  const [typingMembers] = useTypingMembers(roomTimeline);
  const [isAtBottom, setIsAtBottom] = useScrollToBottom(roomTimeline);

  const handleScrollToBottom = () => {
    roomTimeline.emit(cons.events.roomTimeline.SCROLL_TO_LIVE);
    setIsAtBottom(true);
  };

  return (
    <>
      <div className={`room-view__unread ${isJumpToEvent ? 'room-view__unread--open' : ''}`}>
        <Button onClick={jumpToEvent} variant="primary">
          <Text variant="b2">Jump to unread</Text>
        </Button>
        <IconButton
          onClick={cancelJumpToEvent}
          variant="primary"
          size="extra-small"
          src={TickMarkIC}
          tooltipPlacement="bottom"
          tooltip="Mark as read"
        />
      </div>
      <div className={`room-view__typing${typingMembers.size > 0 ? ' room-view__typing--open' : ''}`}>
        <div className="bouncing-loader"><div /></div>
        <Text variant="b2">{getUsersActionJsx(roomId, [...typingMembers], 'typing...')}</Text>
      </div>
      <div className={`room-view__STB${isAtBottom ? '' : ' room-view__STB--open'}`}>
        <IconButton
          onClick={handleScrollToBottom}
          src={ChevronBottomIC}
          tooltip="Scroll to Bottom"
        />
      </div>
    </>
  );
}
RoomViewFloating.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
};

export default RoomViewFloating;
