import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ChannelView.scss';

import EventEmitter from 'events';

import RoomTimeline from '../../../client/state/RoomTimeline';

import ScrollView from '../../atoms/scroll/ScrollView';

import ChannelViewHeader from './ChannelViewHeader';
import ChannelViewContent from './ChannelViewContent';
import ChannelViewFloating from './ChannelViewFloating';
import ChannelViewInput from './ChannelViewInput';
import ChannelViewCmdBar from './ChannelViewCmdBar';

import { scrollToBottom, isAtBottom, autoScrollToBottom } from './common';

const viewEvent = new EventEmitter();

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
                viewEvent={viewEvent}
              />
            )}
          </ScrollView>
          {roomTimeline !== null && (
            <ChannelViewFloating
              roomId={roomId}
              roomTimeline={roomTimeline}
              timelineScroll={timelineScroll}
              viewEvent={viewEvent}
            />
          )}
        </div>
        {roomTimeline !== null && (
          <div className="channel-view__sticky">
            <ChannelViewInput
              roomId={roomId}
              roomTimeline={roomTimeline}
              timelineScroll={timelineScroll}
              viewEvent={viewEvent}
            />
            <ChannelViewCmdBar
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
ChannelView.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default ChannelView;
