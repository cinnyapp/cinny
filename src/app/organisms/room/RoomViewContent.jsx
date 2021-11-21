/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/prop-types */
import React, { useState, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomViewContent.scss';

import dateFormat from 'dateformat';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { diffMinutes, isNotInSameDay } from '../../../util/common';
import { openProfileViewer } from '../../../client/action/navigation';

import Divider from '../../atoms/divider/Divider';
import { Message, PlaceholderMessage } from '../../molecules/message/Message';
import RoomIntro from '../../molecules/room-intro/RoomIntro';
import TimelineChange from '../../molecules/message/TimelineChange';

import { parseTimelineChange } from './common';

const MAX_MSG_DIFF_MINUTES = 5;

function genPlaceholders(key) {
  return (
    <React.Fragment key={`placeholder-container${key}`}>
      <PlaceholderMessage key={`placeholder-1${key}`} />
      <PlaceholderMessage key={`placeholder-2${key}`} />
    </React.Fragment>
  );
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
  // force update RoomTimeline
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
    trySendingReadReceipt();
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

  const handleOnClickCapture = (e) => {
    const { target } = e;
    const userId = target.getAttribute('data-mx-pill');
    if (!userId) return;

    openProfileViewer(userId, roomId);
  };

  let prevMEvent = null;
  const renderMessage = (mEvent) => {
    const isContentOnly = (prevMEvent !== null && prevMEvent.getType() !== 'm.room.member'
      && diffMinutes(mEvent.getDate(), prevMEvent.getDate()) <= MAX_MSG_DIFF_MINUTES
      && prevMEvent.getSender() === mEvent.getSender()
    );

    let DividerComp = null;
    if (prevMEvent !== null && isNotInSameDay(mEvent.getDate(), prevMEvent.getDate())) {
      DividerComp = <Divider key={`divider-${mEvent.getId()}`} text={`${dateFormat(mEvent.getDate(), 'mmmm dd, yyyy')}`} />;
    }
    prevMEvent = mEvent;

    if (mEvent.getType() === 'm.room.member') {
      const timelineChange = parseTimelineChange(mEvent);
      if (timelineChange === null) return false;
      return (
        <React.Fragment key={`box-${mEvent.getId()}`}>
          {DividerComp}
          <TimelineChange
            key={mEvent.getId()}
            variant={timelineChange.variant}
            content={timelineChange.content}
            time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
          />
        </React.Fragment>
      );
    }
    return (
      <React.Fragment key={`box-${mEvent.getId()}`}>
        {DividerComp}
        <Message mEvent={mEvent} isBodyOnly={isContentOnly} roomTimeline={roomTimeline} />
      </React.Fragment>
    );
  };

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
        if (mEvent.getType() === 'm.room.create') tl.push(genRoomIntro(mEvent, roomTimeline));
        else tl.push(renderMessage(mEvent));
      }
      i += 1;
      if (i > scroll.getEndIndex()) break;
    }
    if (i < timeline.size) tl.push(genPlaceholders(2));

    return tl;
  };

  return (
    <div className="room-view__content" onClick={handleOnClickCapture}>
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
