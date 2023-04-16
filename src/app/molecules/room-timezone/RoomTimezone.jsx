import React, { useState } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import Button from '../../atoms/button/Button';
import Text from '../../atoms/text/Text';

import './RoomTimezone.scss';

function RoomTimezone({ roomId }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const userId = mx.getUserId();

  const timezoneEventId = room.currentState.getStateEvents('in.cinny.shared_timezone', userId)?.event?.content?.user_timezone_event;
  const timezoneEvent = room.findEventById(timezoneEventId);
  const timezoneContent = timezoneEvent?.getContent();

  const [timezone, setTimezone] = useState(timezoneContent?.user_timezone);

  const clearTimezone = () => {
    const eventKey = room.currentState.getStateEvents('in.cinny.shared_timezone', userId)?.event?.content?.user_timezone_event;
    mx.redactEvent(roomId, eventKey);
    mx.sendStateEvent(roomId, 'in.cinny.shared_timezone', { }, userId);
    setTimezone(null);
  };

  const shareTimezone = () => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(userTimezone);
    const content = {
      user_timezone: userTimezone,
      msgtype: 'in.cinny.share_timezone',
    };
    mx.sendEvent(roomId, 'in.cinny.share_timezone', content).then((event) => {
      // Append the shared timezone event to the room state
      mx.sendStateEvent(roomId, 'in.cinny.shared_timezone', { user_timezone_event: event.event_id }, userId);
    });
  };

  return (
    <div className="room-timezone__content">
      <Text className="room-timezone__message">Share your timezone</Text>
      <Text className="room-timezone__message" variant="b3">
        Sharing your timezone will allow other users in this room to see your local time.
        Keep in mind that sharing your timezone will share your approximate location.
      </Text>
      <Text className="room-timezone__message" variant="b2">
        {timezone ? `Currently shared timezone: ${timezone}` : 'You are not currently sharing a timezone'}
      </Text>
      <Button onClick={() => shareTimezone()} variant={timezone ? 'surface' : 'danger'}>
        {timezone ? 'Update Timezone' : 'Share Timezone'}
      </Button>

      <Button onClick={() => clearTimezone()} disabled={!timezone}>
        Clear Shared Timezone
      </Button>
    </div>
  );
}

RoomTimezone.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomTimezone;
