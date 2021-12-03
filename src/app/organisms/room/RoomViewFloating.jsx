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
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import { getUsersActionJsx } from './common';

function useJumpToEvent(roomTimeline) {
  const [eventId, setEventId] = useState(null);

  const jumpToEvent = () => {
    roomTimeline.loadEventTimeline(eventId);
    setEventId(null);
  };

  const cancelJumpToEvent = () => {
    setEventId(null);
    roomTimeline.markAsRead();
  };

  // TODO: if user reaches the unread messages with other ways
  // like by paginating, or loading timeline for that event by other ways ex: clicking on reply.
  // then setEventId(null);

  useEffect(() => {
    const readEventId = roomTimeline.getReadUpToEventId();
    // we only show "Jump to unread" btn only if the event is not in live timeline.
    // if event is in live timeline
    // we will automatically open the timeline from that event
    if (!roomTimeline.hasEventInLiveTimeline(readEventId)) {
      setEventId(readEventId);
    }

    return () => {
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

function useScrollToBottom(roomId, viewEvent) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const handleAtBottom = (atBottom) => setIsAtBottom(atBottom);

  useEffect(() => {
    setIsAtBottom(true);
    viewEvent.on('at-bottom', handleAtBottom);
    return () => viewEvent.removeListener('at-bottom', handleAtBottom);
  }, [roomId]);

  return [isAtBottom, setIsAtBottom];
}

function RoomViewFloating({
  roomId, roomTimeline, viewEvent,
}) {
  const [isJumpToEvent, jumpToEvent, cancelJumpToEvent] = useJumpToEvent(roomTimeline, viewEvent);
  const [typingMembers] = useTypingMembers(roomTimeline);
  const [isAtBottom, setIsAtBottom] = useScrollToBottom(roomId, viewEvent);

  const handleScrollToBottom = () => {
    viewEvent.emit('scroll-to-live');
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
          src={CrossIC}
          tooltipPlacement="bottom"
          tooltip="Cancel"
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
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewFloating;
