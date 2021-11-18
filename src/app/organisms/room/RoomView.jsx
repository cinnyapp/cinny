import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './RoomView.scss';

import EventEmitter from 'events';

import RoomTimeline from '../../../client/state/RoomTimeline';
import { Debounce, getScrollInfo } from '../../../util/common';

import ScrollView from '../../atoms/scroll/ScrollView';

import RoomViewHeader from './RoomViewHeader';
import RoomViewContent from './RoomViewContent';
import RoomViewFloating from './RoomViewFloating';
import RoomViewInput from './RoomViewInput';
import RoomViewCmdBar from './RoomViewCmdBar';

const viewEvent = new EventEmitter();

function RoomView({ roomId }) {
  const [roomTimeline, updateRoomTimeline] = useState(null);
  const [debounce] = useState(new Debounce());
  const timelineSVRef = useRef(null);

  useEffect(() => {
    roomTimeline?.removeInternalListeners();
    updateRoomTimeline(new RoomTimeline(roomId));
  }, [roomId]);

  const timelineScroll = {
    reachBottom() {
      timelineScroll.isOngoing = true;
      const target = timelineSVRef?.current;
      if (!target) return;
      const maxScrollTop = target.scrollHeight - target.offsetHeight;
      target.scrollTop = maxScrollTop;
      timelineScroll.position = 'BOTTOM';
      timelineScroll.isScrollable = maxScrollTop > 0;
      timelineScroll.isInTopHalf = false;
      timelineScroll.lastTopMsg = null;
      timelineScroll.lastBottomMsg = null;
    },
    autoReachBottom() {
      if (timelineScroll.position === 'BOTTOM') timelineScroll.reachBottom();
    },
    tryRestoringScroll() {
      timelineScroll.isOngoing = true;
      const sv = timelineSVRef.current;
      const {
        lastTopMsg, lastBottomMsg,
        diff, isInTopHalf, lastTop,
      } = timelineScroll;

      if (lastTopMsg === null) {
        sv.scrollTop = sv.scrollHeight;
        return;
      }

      const ot = isInTopHalf ? lastTopMsg?.offsetTop : lastBottomMsg?.offsetTop;
      if (!ot) sv.scrollTop = lastTop;
      else sv.scrollTop = ot - diff;
    },
    position: 'BOTTOM',
    isScrollable: false,
    isInTopHalf: false,
    maxEvents: 50,
    lastTop: 0,
    lastHeight: 0,
    lastViewHeight: 0,
    lastTopMsg: null,
    lastBottomMsg: null,
    diff: 0,
    isOngoing: false,
  };

  const calcScroll = (target) => {
    if (timelineScroll.isOngoing) {
      timelineScroll.isOngoing = false;
      return;
    }
    const PLACEHOLDER_COUNT = 2;
    const PLACEHOLDER_HEIGHT = 96 * PLACEHOLDER_COUNT;
    const SMALLEST_MSG_HEIGHT = 32;
    const scroll = getScrollInfo(target);

    const isPaginateBack = scroll.top < PLACEHOLDER_HEIGHT;
    const isPaginateForward = scroll.bottom > (scroll.height - PLACEHOLDER_HEIGHT);
    timelineScroll.isInTopHalf = scroll.top + (scroll.viewHeight / 2) < scroll.height / 2;

    if (timelineScroll.lastViewHeight !== scroll.viewHeight) {
      timelineScroll.maxEvents = Math.round(scroll.viewHeight / SMALLEST_MSG_HEIGHT) * 3;
      timelineScroll.lastViewHeight = scroll.viewHeight;
    }
    timelineScroll.isScrollable = scroll.isScrollable;
    timelineScroll.lastTop = scroll.top;
    timelineScroll.lastHeight = scroll.height;
    const tChildren = target.lastElementChild.lastElementChild.children;
    const lCIndex = tChildren.length - 1;

    timelineScroll.lastTopMsg = tChildren[0]?.className === 'ph-msg'
      ? tChildren[PLACEHOLDER_COUNT]
      : tChildren[0];
    timelineScroll.lastBottomMsg = tChildren[lCIndex]?.className === 'ph-msg'
      ? tChildren[lCIndex - PLACEHOLDER_COUNT]
      : tChildren[lCIndex];

    if (timelineScroll.isInTopHalf && timelineScroll.lastBottomMsg) {
      timelineScroll.diff = timelineScroll.lastTopMsg.offsetTop - scroll.top;
    } else {
      timelineScroll.diff = timelineScroll.lastBottomMsg.offsetTop - scroll.top;
    }

    if (isPaginateBack) {
      timelineScroll.position = 'TOP';
      viewEvent.emit('timeline-scroll', timelineScroll.position);
    } else if (isPaginateForward) {
      timelineScroll.position = 'BOTTOM';
      viewEvent.emit('timeline-scroll', timelineScroll.position);
    } else {
      timelineScroll.position = 'BETWEEN';
      viewEvent.emit('timeline-scroll', timelineScroll.position);
    }
  };

  const handleTimelineScroll = (event) => {
    const { target } = event;
    if (!target) return;
    debounce._(calcScroll, 200)(target);
  };

  return (
    <div className="room-view">
      <RoomViewHeader roomId={roomId} />
      <div className="room-view__content-wrapper">
        <div className="room-view__scrollable">
          <ScrollView onScroll={handleTimelineScroll} ref={timelineSVRef} autoHide>
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
