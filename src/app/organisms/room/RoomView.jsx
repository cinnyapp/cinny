import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './RoomView.scss';
import { Text, config } from 'folds';
import { EventType } from 'matrix-js-sdk';

import EventEmitter from 'events';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import RoomViewHeader from './RoomViewHeader';
import RoomViewContent from './RoomViewContent';
import RoomViewFloating from './RoomViewFloating';
import RoomViewCmdBar from './RoomViewCmdBar';
import { RoomInput } from './RoomInput';
import { useStateEvent } from '../../hooks/useStateEvent';
import { StateEvent } from '../../../types/matrix/room';
import { RoomTombstone } from './RoomTombstone';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';

const viewEvent = new EventEmitter();

function RoomView({ room, roomTimeline, eventId }) {
  const roomInputRef = useRef(null);
  const roomViewRef = useRef(null);
  // eslint-disable-next-line react/prop-types
  const { roomId } = roomTimeline;

  const mx = useMatrixClient();
  const tombstoneEvent = useStateEvent(room, StateEvent.RoomTombstone);
  const { getPowerLevel, canSendEvent } = usePowerLevels(room);
  const myUserId = mx.getUserId();
  const canMessage = myUserId
    ? canSendEvent(EventType.RoomMessage, getPowerLevel(myUserId))
    : false;

  useEffect(() => {
    const settingsToggle = (isVisible) => {
      const roomView = roomViewRef.current;
      roomView.classList.toggle('room-view--dropped');

      const roomViewContent = roomView.children[1];
      if (isVisible) {
        setTimeout(() => {
          if (!navigation.isRoomSettings) return;
          roomViewContent.style.visibility = 'hidden';
        }, 200);
      } else roomViewContent.style.visibility = 'visible';
    };
    navigation.on(cons.events.navigation.ROOM_SETTINGS_TOGGLED, settingsToggle);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SETTINGS_TOGGLED, settingsToggle);
    };
  }, []);

  return (
    <div className="room-view" ref={roomViewRef}>
      <RoomViewHeader roomId={roomId} />
      <div className="room-view__content-wrapper">
        <div className="room-view__scrollable">
          <RoomViewContent
            eventId={eventId}
            roomTimeline={roomTimeline}
            roomInputRef={roomInputRef}
          />
          <RoomViewFloating roomId={roomId} roomTimeline={roomTimeline} />
        </div>
        <div className="room-view__sticky">
          <div className="room-view__editor">
            {tombstoneEvent ? (
              <RoomTombstone
                roomId={roomId}
                body={tombstoneEvent.getContent().body}
                replacementRoomId={tombstoneEvent.getContent().replacement_room}
              />
            ) : (
              <>
                {canMessage && (
                  <RoomInput roomId={roomId} roomViewRef={roomViewRef} ref={roomInputRef} />
                )}
                {!canMessage && (
                  <RoomInputPlaceholder
                    style={{ padding: config.space.S200 }}
                    alignItems="Center"
                    justifyContent="Center"
                  >
                    <Text align="Center">You do not have permission to post in this room</Text>
                  </RoomInputPlaceholder>
                )}
              </>
            )}
          </div>
          <RoomViewCmdBar roomId={roomId} roomTimeline={roomTimeline} viewEvent={viewEvent} />
        </div>
      </div>
    </div>
  );
}

RoomView.defaultProps = {
  eventId: null,
};
RoomView.propTypes = {
  room: PropTypes.shape({}).isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  eventId: PropTypes.string,
};

export default RoomView;
