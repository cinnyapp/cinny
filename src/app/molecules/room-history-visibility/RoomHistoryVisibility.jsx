import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomHistoryVisibility.scss';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import RadioButton from '../../atoms/button/RadioButton';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';

const visibility = {
  WORLD_READABLE: 'world_readable',
  SHARED: 'shared',
  INVITED: 'invited',
  JOINED: 'joined',
};

const items = [{
  iconSrc: null,
  text: 'Anyone (including guests)',
  type: visibility.WORLD_READABLE,
}, {
  iconSrc: null,
  text: 'Members (all messages)',
  type: visibility.SHARED,
}, {
  iconSrc: null,
  text: 'Members (messages after invite)',
  type: visibility.INVITED,
}, {
  iconSrc: null,
  text: 'Members (messages after join)',
  type: visibility.JOINED,
}];

function setHistoryVisibility(roomId, type) {
  const mx = initMatrix.matrixClient;

  return mx.sendStateEvent(
    roomId, 'm.room.history_visibility',
    {
      history_visibility: type,
    },
  );
}

function useVisibility(roomId) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  const [activeType, setActiveType] = useState(room.getHistoryVisibility());
  useEffect(() => setActiveType(room.getHistoryVisibility()), [roomId]);

  const setVisibility = useCallback((item) => {
    if (item.type === activeType.type) return;
    setActiveType(item.type);
    setHistoryVisibility(roomId, item.type);
  }, [activeType, roomId]);

  return [activeType, setVisibility];
}

function RoomHistoryVisibility({ roomId }) {
  const [activeType, setVisibility] = useVisibility(roomId);
  const mx = initMatrix.matrixClient;
  const userId = mx.getUserId();
  const room = mx.getRoom(roomId);
  const { currentState } = room;

  const canChange = currentState.maySendStateEvent('m.room.history_visibility', userId);

  return (
    <div className="room-history-visibility">
      {
        items.map((item) => (
          <MenuItem
            variant={activeType === item.type ? 'positive' : 'surface'}
            key={item.type}
            iconSrc={item.iconSrc}
            onClick={() => setVisibility(item)}
            disabled={(!canChange)}
          >
            <Text varient="b1">
              <span>{item.text}</span>
              <RadioButton isActive={activeType === item.type} />
            </Text>
          </MenuItem>
        ))
      }
      <Text variant="b3">Changes to history visibility will only apply to future messages. The visibility of existing history will have no effect.</Text>
    </div>
  );
}

RoomHistoryVisibility.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomHistoryVisibility;
