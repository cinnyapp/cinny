import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './RoomVisibility.scss';
import { EventTimeline } from 'matrix-js-sdk';

import Text from '../../atoms/text/Text';
import RadioButton from '../../atoms/button/RadioButton';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';

import HashIC from '../../../../public/res/ic/outlined/hash.svg';
import HashLockIC from '../../../../public/res/ic/outlined/hash-lock.svg';
import HashGlobeIC from '../../../../public/res/ic/outlined/hash-globe.svg';
import SpaceIC from '../../../../public/res/ic/outlined/space.svg';
import SpaceLockIC from '../../../../public/res/ic/outlined/space-lock.svg';
import SpaceGlobeIC from '../../../../public/res/ic/outlined/space-globe.svg';
import { useMatrixClient } from '../../hooks/useMatrixClient';

const visibility = {
  INVITE: 'invite',
  RESTRICTED: 'restricted',
  PUBLIC: 'public',
};

function setJoinRule(mx, roomId, type) {
  let allow;
  if (type === visibility.RESTRICTED) {
    const { currentState } = mx.getRoom(roomId);
    const mEvent = currentState.getStateEvents('m.space.parent')[0];
    if (!mEvent) return Promise.resolve(undefined);

    allow = [{
      room_id: mEvent.getStateKey(),
      type: 'm.room_membership',
    }];
  }

  return mx.sendStateEvent(
    roomId,
    'm.room.join_rules',
    {
      join_rule: type,
      allow,
    },
  );
}

function useVisibility(roomId) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);

  const [activeType, setActiveType] = useState(room.getJoinRule());
  useEffect(() => {
    setActiveType(room.getJoinRule());
  }, [room]);

  const setNotification = useCallback((item) => {
    if (item.type === activeType.type) return;
    setActiveType(item.type);
    setJoinRule(mx, roomId, item.type);
  }, [mx, activeType, roomId]);

  return [activeType, setNotification];
}

function RoomVisibility({ roomId }) {
  const [activeType, setVisibility] = useVisibility(roomId);
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  const isSpace = room.isSpaceRoom();
  const { currentState } = room;

  const noSpaceParent = currentState.getStateEvents('m.space.parent').length === 0;
  const mCreate = currentState.getStateEvents('m.room.create')[0]?.getContent();
  const roomVersion = Number(mCreate?.room_version ?? 0);

  const myPowerlevel = room.getMember(mx.getUserId())?.powerLevel || 0;
  const canChange = room.getLiveTimeline().getState(EventTimeline.FORWARDS)?.hasSufficientPowerLevelFor('state_default', myPowerlevel);

  const items = [{
    iconSrc: isSpace ? SpaceLockIC : HashLockIC,
    text: 'Private (invite only)',
    type: visibility.INVITE,
    unsupported: false,
  }, {
    iconSrc: isSpace ? SpaceIC : HashIC,
    text: roomVersion < 8 ? 'Restricted (unsupported: required room upgrade)' : 'Restricted (space member can join)',
    type: visibility.RESTRICTED,
    unsupported: roomVersion < 8 || noSpaceParent,
  }, {
    iconSrc: isSpace ? SpaceGlobeIC : HashGlobeIC,
    text: 'Public (anyone can join)',
    type: visibility.PUBLIC,
    unsupported: false,
  }];

  return (
    <div className="room-visibility">
      {
        items.map((item) => (
          <MenuItem
            variant={activeType === item.type ? 'positive' : 'surface'}
            key={item.type}
            iconSrc={item.iconSrc}
            onClick={() => setVisibility(item)}
            disabled={(!canChange || item.unsupported)}
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

RoomVisibility.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomVisibility;
