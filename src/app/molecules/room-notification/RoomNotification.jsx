import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomNotification.scss';

import cons from '../../../client/state/cons';

import Text from '../../atoms/text/Text';
import RadioButton from '../../atoms/button/RadioButton';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';

import BellIC from '../../../../public/res/ic/outlined/bell.svg';
import BellRingIC from '../../../../public/res/ic/outlined/bell-ring.svg';
import BellPingIC from '../../../../public/res/ic/outlined/bell-ping.svg';
import BellOffIC from '../../../../public/res/ic/outlined/bell-off.svg';
import { getNotificationType } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';

const items = [
  {
    iconSrc: BellIC,
    text: 'Global',
    type: cons.notifs.DEFAULT,
  },
  {
    iconSrc: BellRingIC,
    text: 'All messages',
    type: cons.notifs.ALL_MESSAGES,
  },
  {
    iconSrc: BellPingIC,
    text: 'Mentions & Keywords',
    type: cons.notifs.MENTIONS_AND_KEYWORDS,
  },
  {
    iconSrc: BellOffIC,
    text: 'Mute',
    type: cons.notifs.MUTE,
  },
];

function setRoomNotifType(mx, roomId, newType) {
  let roomPushRule;
  try {
    roomPushRule = mx.getRoomPushRule('global', roomId);
  } catch {
    roomPushRule = undefined;
  }
  const promises = [];

  if (newType === cons.notifs.MUTE) {
    if (roomPushRule) {
      promises.push(mx.deletePushRule('global', 'room', roomPushRule.rule_id));
    }
    promises.push(
      mx.addPushRule('global', 'override', roomId, {
        conditions: [
          {
            kind: 'event_match',
            key: 'room_id',
            pattern: roomId,
          },
        ],
        actions: ['dont_notify'],
      })
    );
    return promises;
  }

  const oldState = getNotificationType(mx, roomId);
  if (oldState === cons.notifs.MUTE) {
    promises.push(mx.deletePushRule('global', 'override', roomId));
  }

  if (newType === cons.notifs.DEFAULT) {
    if (roomPushRule) {
      promises.push(mx.deletePushRule('global', 'room', roomPushRule.rule_id));
    }
    return Promise.all(promises);
  }

  if (newType === cons.notifs.MENTIONS_AND_KEYWORDS) {
    promises.push(
      mx.addPushRule('global', 'room', roomId, {
        actions: ['dont_notify'],
      })
    );
    promises.push(mx.setPushRuleEnabled('global', 'room', roomId, true));
    return Promise.all(promises);
  }

  // cons.notifs.ALL_MESSAGES
  promises.push(
    mx.addPushRule('global', 'room', roomId, {
      actions: [
        'notify',
        {
          set_tweak: 'sound',
          value: 'default',
        },
      ],
    })
  );

  promises.push(mx.setPushRuleEnabled('global', 'room', roomId, true));

  return Promise.all(promises);
}

function useNotifications(roomId) {
  const mx = useMatrixClient();
  const [activeType, setActiveType] = useState(getNotificationType(mx, roomId));
  useEffect(() => {
    setActiveType(getNotificationType(mx, roomId));
  }, [mx, roomId]);

  const setNotification = useCallback(
    (item) => {
      if (item.type === activeType.type) return;
      setActiveType(item.type);
      setRoomNotifType(mx, roomId, item.type);
    },
    [mx, activeType, roomId]
  );
  return [activeType, setNotification];
}

function RoomNotification({ roomId }) {
  const [activeType, setNotification] = useNotifications(roomId);

  return (
    <div className="room-notification">
      {items.map((item) => (
        <MenuItem
          variant={activeType === item.type ? 'positive' : 'surface'}
          key={item.type}
          iconSrc={item.iconSrc}
          onClick={() => setNotification(item)}
        >
          <Text varient="b1">
            <span>{item.text}</span>
            <RadioButton isActive={activeType === item.type} />
          </Text>
        </MenuItem>
      ))}
    </div>
  );
}

RoomNotification.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomNotification;
