import React, { useState, useEffect, useRef } from 'react';
import './RoomOptions.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { openInviteUser } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import ContextMenu, { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';

import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';
import BellIC from '../../../../public/res/ic/outlined/bell.svg';
import BellRingIC from '../../../../public/res/ic/outlined/bell-ring.svg';
import BellPingIC from '../../../../public/res/ic/outlined/bell-ping.svg';
import BellOffIC from '../../../../public/res/ic/outlined/bell-off.svg';
import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';

function getNotifState(roomId) {
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

function setRoomNotifMute(roomId) {
  const mx = initMatrix.matrixClient;
  const roomPushRule = mx.getRoomPushRule('global', roomId);

  const promises = [];
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

  return Promise.all(promises);
}

function setRoomNotifsState(newState, roomId) {
  const mx = initMatrix.matrixClient;
  const promises = [];

  const oldState = getNotifState(roomId);
  if (oldState === cons.notifs.MUTE) {
    promises.push(mx.deletePushRule('global', 'override', roomId));
  }

  if (newState === cons.notifs.DEFAULT) {
    const roomPushRule = mx.getRoomPushRule('global', roomId);
    if (roomPushRule) {
      promises.push(mx.deletePushRule('global', 'room', roomPushRule.rule_id));
    }
    return Promise.all(promises);
  }

  if (newState === cons.notifs.MENTIONS_AND_KEYWORDS) {
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

function setRoomNotifPushRule(notifState, roomId) {
  if (notifState === cons.notifs.MUTE) {
    setRoomNotifMute(roomId);
    return;
  }
  setRoomNotifsState(notifState, roomId);
}

let isRoomOptionVisible = false;
let roomId = null;
function RoomOptions() {
  const openerRef = useRef(null);
  const [notifState, setNotifState] = useState(cons.notifs.DEFAULT);

  function openRoomOptions(cords, rId) {
    if (roomId !== null || isRoomOptionVisible) {
      roomId = null;
      if (cords.detail === 0) openerRef.current.click();
      return;
    }
    openerRef.current.style.transform = `translate(${cords.x}px, ${cords.y}px)`;
    roomId = rId;
    setNotifState(getNotifState(roomId));
    openerRef.current.click();
  }

  function afterRoomOptionsToggle(isVisible) {
    isRoomOptionVisible = isVisible;
    if (!isVisible) {
      setTimeout(() => {
        if (!isRoomOptionVisible) roomId = null;
      }, 500);
    }
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.ROOMOPTIONS_OPENED, openRoomOptions);
    return () => {
      navigation.on(cons.events.navigation.ROOMOPTIONS_OPENED, openRoomOptions);
    };
  }, []);

  const handleMarkAsRead = () => {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(roomId);
    if (!room) return;
    const events = room.getLiveTimeline().getEvents();
    mx.sendReadReceipt(events[events.length - 1]);
  };

  const handleInviteClick = () => openInviteUser(roomId);
  const handleLeaveClick = (toggleMenu) => {
    if (confirm('Are you really want to leave this room?')) {
      roomActions.leave(roomId);
      toggleMenu();
    }
  };

  function setNotif(nState, currentNState) {
    if (nState === currentNState) return;
    setRoomNotifPushRule(nState, roomId);
    setNotifState(nState);
  }

  return (
    <ContextMenu
      afterToggle={afterRoomOptionsToggle}
      maxWidth={298}
      content={(toggleMenu) => (
        <>
          <MenuHeader>{twemojify(`Options for ${initMatrix.matrixClient.getRoom(roomId)?.name}`)}</MenuHeader>
          <MenuItem
            iconSrc={TickMarkIC}
            onClick={() => {
              handleMarkAsRead(); toggleMenu();
            }}
          >
            Mark as read
          </MenuItem>
          <MenuItem
            iconSrc={AddUserIC}
            onClick={() => {
              handleInviteClick(); toggleMenu();
            }}
          >
            Invite
          </MenuItem>
          <MenuItem iconSrc={LeaveArrowIC} variant="danger" onClick={() => handleLeaveClick(toggleMenu)}>Leave</MenuItem>
          <MenuHeader>Notification</MenuHeader>
          <MenuItem
            variant={notifState === cons.notifs.DEFAULT ? 'positive' : 'surface'}
            iconSrc={BellIC}
            onClick={() => setNotif(cons.notifs.DEFAULT, notifState)}
          >
            Default
          </MenuItem>
          <MenuItem
            variant={notifState === cons.notifs.ALL_MESSAGES ? 'positive' : 'surface'}
            iconSrc={BellRingIC}
            onClick={() => setNotif(cons.notifs.ALL_MESSAGES, notifState)}
          >
            All messages
          </MenuItem>
          <MenuItem
            variant={notifState === cons.notifs.MENTIONS_AND_KEYWORDS ? 'positive' : 'surface'}
            iconSrc={BellPingIC}
            onClick={() => setNotif(cons.notifs.MENTIONS_AND_KEYWORDS, notifState)}
          >
            Mentions & Keywords
          </MenuItem>
          <MenuItem
            variant={notifState === cons.notifs.MUTE ? 'positive' : 'surface'}
            iconSrc={BellOffIC}
            onClick={() => setNotif(cons.notifs.MUTE, notifState)}
          >
            Mute
          </MenuItem>
        </>
      )}
      render={(toggleMenu) => (
        <input
          ref={openerRef}
          onClick={toggleMenu}
          type="button"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            position: 'absolute',
            top: 0,
            left: 0,
            padding: 0,
            border: 'none',
            visibility: 'hidden',
          }}
        />
      )}
    />
  );
}

export default RoomOptions;
