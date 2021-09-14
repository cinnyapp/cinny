import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './RoomView.scss';

import EventEmitter from 'events';

import RoomTimeline from '../../../client/state/RoomTimeline';

import ScrollView from '../../atoms/scroll/ScrollView';

import RoomViewHeader from './RoomViewHeader';
import RoomViewContent from './RoomViewContent';
import RoomViewFloating from './RoomViewFloating';
import RoomViewInput from './RoomViewInput';
import RoomViewCmdBar from './RoomViewCmdBar';

import { scrollToBottom, isAtBottom, autoScrollToBottom } from './common';

const viewEvent = new EventEmitter();

let lastScrollTop = 0;
let lastScrollHeight = 0;
let isReachedBottom = true;
let isReachedTop = false;
function RoomView({ roomId }) {
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
    <div className="room-view">
      <RoomViewHeader roomId={roomId} />
      <div className="room-view__content-wrapper">
        <div className="room-view__scrollable">
          <ScrollView onScroll={onTimelineScroll} ref={timelineSVRef} autoHide>
            {roomTimeline !== null && (
              <RoomViewContent
                roomId={roomId}
                roomTimeline={roomTimeline}
                timelineScroll={timelineScroll}
                viewEvent={viewEvent}
              />
            )}
          </ScrollView>
          {roomTimeline !== null && (
            <RoomViewFloating
              roomId={roomId}
              roomTimeline={roomTimeline}
              timelineScroll={timelineScroll}
              viewEvent={viewEvent}
            />
          )}
        </div>
        {roomTimeline !== null && (
          <div className="room-view__sticky">
            <RoomViewInput
              roomId={roomId}
              roomTimeline={roomTimeline}
              timelineScroll={timelineScroll}
              viewEvent={viewEvent}
            />
            <RoomViewCmdBar
              roomId={roomId}
              roomTimeline={roomTimeline}
              viewEvent={viewEvent}
            />
          </div>
        )}
      </div>
    </div>
  );
}
RoomView.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomView;
