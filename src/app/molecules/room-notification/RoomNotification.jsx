import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomNotification.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';

import Text from '../../atoms/text/Text';
import RadioButton from '../../atoms/button/RadioButton';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';

import BellIC from '../../../../public/res/ic/outlined/bell.svg';
import BellRingIC from '../../../../public/res/ic/outlined/bell-ring.svg';
import BellPingIC from '../../../../public/res/ic/outlined/bell-ping.svg';
import BellOffIC from '../../../../public/res/ic/outlined/bell-off.svg';

const items = [{
  iconSrc: BellIC,
  text: 'Global',
  type: cons.notifs.DEFAULT,
}, {
  iconSrc: BellRingIC,
  text: 'All message',
  type: cons.notifs.ALL_MESSAGES,
}, {
  iconSrc: BellPingIC,
  text: 'Mentions & Keywords',
  type: cons.notifs.MENTIONS_AND_KEYWORDS,
}, {
  iconSrc: BellOffIC,
  text: 'Mute',
  type: cons.notifs.MUTE,
}];

function getNotifType(roomId) {
  const mx = initMatrix.matrixClient;
  const pushRule = mx.getRoomPushRule('global', roomId);

  if (typeof pushRule === 'undefined') {
    const overridePushRules = mx.getAccountData('m.push_rules')?.getContent()?.global?.override;
    if (typeof overridePushRules === 'undefined') return 0;

    const isMuteOverride = overridePushRules.find((rule) => (
      rule.rule_id === roomId
      && rule.actions[0] === 'dont_notify'
      && rule.conditions[0].kind === 'event_match'
    ));

    return isMuteOverride ? cons.notifs.MUTE : cons.notifs.DEFAULT;
  }
  if (pushRule.actions[0] === 'notify') return cons.notifs.ALL_MESSAGES;
  return cons.notifs.MENTIONS_AND_KEYWORDS;
}

function setRoomNotifType(roomId, newType) {
  const mx = initMatrix.matrixClient;
  const roomPushRule = mx.getRoomPushRule('global', roomId);
  const promises = [];

  if (newType === cons.notifs.MUTE) {
    if (roomPushRule) {
      promises.push(mx.deletePushRule('global', 'room', roomPushRule.rule_id));
    }
    promises.push(mx.addPushRule('global', 'override', roomId, {
      conditions: [
        {
          kind: 'event_match',
          key: 'room_id',
          pattern: roomId,
        },
      ],
      actions: [
        'dont_notify',
      ],
    }));
    return promises;
  }

  const oldState = getNotifType(roomId);
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
    promises.push(mx.addPushRule('global', 'room', roomId, {
      actions: [
        'dont_notify',
      ],
    }));
    promises.push(mx.setPushRuleEnabled('global', 'room', roomId, true));
    return Promise.all(promises);
  }

  // cons.notifs.ALL_MESSAGES
  promises.push(mx.addPushRule('global', 'room', roomId, {
    actions: [
      'notify',
      {
        set_tweak: 'sound',
        value: 'default',
      },
    ],
  }));

  promises.push(mx.setPushRuleEnabled('global', 'room', roomId, true));

  return Promise.all(promises);
}

function useNotifications(roomId) {
  const [activeType, setActiveType] = useState(getNotifType(roomId));
  useEffect(() => setActiveType(getNotifType(roomId)), [roomId]);

  const setNotification = useCallback((item) => {
    if (item.type === activeType.type) return;
    setActiveType(item.type);
    setRoomNotifType(roomId, item.type);
  }, [activeType, roomId]);
  return [activeType, setNotification];
}

function RoomNotification({ roomId }) {
  const [activeType, setNotification] = useNotifications(roomId);

  console.log(roomId)
  console.log(activeType)
  
  return (
    <div className="room-notification">
      {
        items.map((item) => (
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
        ))
      }
    </div>
  );
}

RoomNotification.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomNotification;
