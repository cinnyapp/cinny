import React, { useState } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import Text from '../../atoms/text/Text';

import './RoomBanner.scss';
import RawIcon from '../../atoms/system-icons/RawIcon';

import RecentClockIC from '../../../../public/res/ic/outlined/recent-clock.svg';

import { twemojify } from '../../../util/twemojify';
import { getUsernameOfRoomMember } from '../../../util/matrixUtil';

function RoomBanner({ roomId }) {
  const mx = initMatrix.matrixClient;
  const isDM = initMatrix.roomList.directs.has(roomId);
  const room = mx.getRoom(roomId);

  let partnerLocalTime = null;
  let partner = null;

  if (isDM) {
    partner = room.getAvatarFallbackMember();
    const timezone = room.currentState.getStateEvents('in.cinny.share_timezone', partner.userId)?.event?.content?.user_timezone;
    const date = new Date();

    try {
      partnerLocalTime = date.toLocaleTimeString([], { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
      const userTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // if the partner time and user time are the same, its not worth showing
      if (userTime === partnerLocalTime) { partnerLocalTime = null; }
    } catch {
      partnerLocalTime = null;
    }
  }

  return (
    <div>
      { isDM && partnerLocalTime ? (
        <div className="room-view__banner">
          <RawIcon src={RecentClockIC} size="small" />
          <Text>
            <b>{ twemojify(getUsernameOfRoomMember(partner)) }</b>
            {'\'s local time is: '}
            <b>
              {partnerLocalTime}
            </b>
          </Text>
        </div>
      )
        : null }
    </div>
  );
}

RoomBanner.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomBanner;
