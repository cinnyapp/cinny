/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './FollowingMembers.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { openReadReceipts } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';

import { getUsersActionJsx } from '../../organisms/room/common';

function FollowingMembers({ roomTimeline }) {
  const [followingMembers, setFollowingMembers] = useState([]);
  const { roomId } = roomTimeline;
  const mx = initMatrix.matrixClient;
  const { roomsInput } = initMatrix;
  const myUserId = mx.getUserId();

  const handleOnMessageSent = () => setFollowingMembers([]);

  useEffect(() => {
    const updateFollowingMembers = () => {
      setFollowingMembers(roomTimeline.getLiveReaders());
    };
    updateFollowingMembers();
    roomTimeline.on(cons.events.roomTimeline.LIVE_RECEIPT, updateFollowingMembers);
    roomsInput.on(cons.events.roomsInput.MESSAGE_SENT, handleOnMessageSent);
    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.LIVE_RECEIPT, updateFollowingMembers);
      roomsInput.removeListener(cons.events.roomsInput.MESSAGE_SENT, handleOnMessageSent);
    };
  }, [roomTimeline]);

  const filteredM = followingMembers.filter((userId) => userId !== myUserId);

  return filteredM.length !== 0 && (
    <button
      className="following-members"
      onClick={() => openReadReceipts(roomId, followingMembers)}
      type="button"
    >
      <RawIcon
        size="extra-small"
        src={TickMarkIC}
      />
      <Text variant="b2">{getUsersActionJsx(roomId, filteredM, 'following the conversation.')}</Text>
    </button>
  );
}

FollowingMembers.propTypes = {
  roomTimeline: PropTypes.shape({}).isRequired,
};

export default FollowingMembers;
