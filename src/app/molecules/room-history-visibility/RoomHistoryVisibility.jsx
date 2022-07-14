import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomHistoryVisibility.scss';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import RadioButton from '../../atoms/button/RadioButton';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';

import '../../i18n.jsx'
import { useTranslation } from 'react-i18next';

const visibility = {
  WORLD_READABLE: 'world_readable',
  SHARED: 'shared',
  INVITED: 'invited',
  JOINED: 'joined',
};

const items = [{
  iconSrc: null,
  text: 'Molecules.RoomHistoryVisibility.world_readable',
  type: visibility.WORLD_READABLE,
}, {
  iconSrc: null,
  text: 'Molecules.RoomHistoryVisibility.shared',
  type: visibility.SHARED,
}, {
  iconSrc: null,
  text: 'Molecules.RoomHistoryVisibility.invited',
  type: visibility.INVITED,
}, {
  iconSrc: null,
  text: 'Molecules.RoomHistoryVisibility.joined',
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

  const { t } = useTranslation();

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
              <span>{t(item.text)}</span>
              <RadioButton isActive={activeType === item.type} />
            </Text>
          </MenuItem>
        ))
      }
      <Text variant="b3">{t("Molecules.RoomHistoryVisibility.changes_only_affect_future")}</Text>
    </div>
  );
}

RoomHistoryVisibility.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomHistoryVisibility;
