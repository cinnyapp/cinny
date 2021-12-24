import React, { useEffect, useRef } from 'react';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { openInviteUser } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import ContextMenu, { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import RoomNotification from '../../molecules/room-notification/RoomNotification';

import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';
import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';

let isRoomOptionVisible = false;
let roomId = null;
function RoomOptions() {
  const openerRef = useRef(null);
  const [, forceUpdate] = useForceUpdate();

  function openRoomOptions(cords, rId) {
    if (roomId !== null || isRoomOptionVisible) {
      roomId = null;
      if (cords.detail === 0) openerRef.current.click();
      return;
    }
    openerRef.current.style.transform = `translate(${cords.x}px, ${cords.y}px)`;
    roomId = rId;
    openerRef.current.click();
    forceUpdate();
  }

  const afterRoomOptionsToggle = (isVisible) => {
    isRoomOptionVisible = isVisible;
    if (!isVisible) {
      setTimeout(() => {
        if (!isRoomOptionVisible) roomId = null;
      }, 500);
    }
  };

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

  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const canInvite = room?.canInvite(mx.getUserId());

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
            disabled={!canInvite}
            iconSrc={AddUserIC}
            onClick={() => {
              handleInviteClick(); toggleMenu();
            }}
          >
            Invite
          </MenuItem>
          <MenuItem iconSrc={LeaveArrowIC} variant="danger" onClick={() => handleLeaveClick(toggleMenu)}>Leave</MenuItem>
          <MenuHeader>Notification</MenuHeader>
          {roomId && <RoomNotification roomId={roomId} />}
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
