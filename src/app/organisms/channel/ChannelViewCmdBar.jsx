/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ChannelViewCmdBar.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';

import TimelineChange from '../../molecules/message/TimelineChange';

import { getUsersActionJsx } from './common';

function ChannelViewCmdBar({ roomId, roomTimeline, viewEvent }) {
  const [followingMembers, setFollowingMembers] = useState([]);
  const mx = initMatrix.matrixClient;

  function handleOnMessageSent() {
    setFollowingMembers([]);
  }

  function updateFollowingMembers() {
    const room = mx.getRoom(roomId);
    const { timeline } = room;
    const userIds = room.getUsersReadUpTo(timeline[timeline.length - 1]);
    const myUserId = mx.getUserId();
    setFollowingMembers(userIds.filter((userId) => userId !== myUserId));
  }

  useEffect(() => {
    updateFollowingMembers();
  }, [roomId]);

  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
    viewEvent.on('message_sent', handleOnMessageSent);
    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
      viewEvent.removeListener('message_sent', handleOnMessageSent);
    };
  }, [roomTimeline]);

  return (
    <div className="channel-cmd-bar">
      {
        followingMembers.length !== 0 && (
          <TimelineChange
            variant="follow"
            content={getUsersActionJsx(followingMembers, 'following the conversation.')}
            time=""
          />
        )
      }
    </div>
  );
}
ChannelViewCmdBar.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default ChannelViewCmdBar;
