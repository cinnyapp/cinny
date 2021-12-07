import React from 'react';
import PropTypes from 'prop-types';
import './RoomView.scss';

import EventEmitter from 'events';

import RoomViewHeader from './RoomViewHeader';
import RoomViewContent from './RoomViewContent';
import RoomViewFloating from './RoomViewFloating';
import RoomViewInput from './RoomViewInput';
import RoomViewCmdBar from './RoomViewCmdBar';

const viewEvent = new EventEmitter();

function RoomView({ roomTimeline, eventId }) {
  // eslint-disable-next-line react/prop-types
  const { roomId } = roomTimeline;

  return (
    <div className="room-view">
      <RoomViewHeader roomId={roomId} />
      <div className="room-view__content-wrapper">
        <div className="room-view__scrollable">
          <RoomViewContent
            eventId={eventId}
            roomTimeline={roomTimeline}
          />
          <RoomViewFloating
            roomId={roomId}
            roomTimeline={roomTimeline}
          />
        </div>
        <div className="room-view__sticky">
          <RoomViewInput
            roomId={roomId}
            roomTimeline={roomTimeline}
            viewEvent={viewEvent}
          />
          <RoomViewCmdBar
            roomId={roomId}
            roomTimeline={roomTimeline}
            viewEvent={viewEvent}
          />
        </div>
      </div>
    </div>
  );
}

RoomView.defaultProps = {
  eventId: null,
};
RoomView.propTypes = {
  roomTimeline: PropTypes.shape({}).isRequired,
  eventId: PropTypes.string,
};

export default RoomView;
