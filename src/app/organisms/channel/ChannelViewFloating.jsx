/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ChannelViewFloating.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';

import { Text } from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';

import { getUsersActionJsx } from './common';

function ChannelViewFloating({
  roomId, roomTimeline, timelineScroll, viewEvent,
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
ChannelViewFloating.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  timelineScroll: PropTypes.shape({
    reachBottom: PropTypes.func,
  }).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default ChannelViewFloating;
