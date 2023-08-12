import React, { useState, useEffect } from 'react';
import './Room.scss';
import { Line } from 'folds';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import RoomTimeline from '../../../client/state/RoomTimeline';
import navigation from '../../../client/state/navigation';
import { openNavigation } from '../../../client/action/navigation';

import Welcome from '../welcome/Welcome';
import RoomView from './RoomView';
import RoomSettings from './RoomSettings';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

function Room() {
  const [roomInfo, setRoomInfo] = useState({
    room: null,
    roomTimeline: null,
    eventId: null,
  });
  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const [screenSize] = useScreenSize();

  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleRoomSelected = (rId, pRoomId, eId) => {
      roomInfo.roomTimeline?.removeInternalListeners();
      const r = mx.getRoom(rId);
      if (r) {
        setRoomInfo({
          room: r,
          roomTimeline: new RoomTimeline(rId),
          eventId: eId ?? null,
        });
      } else {
        // TODO: add ability to join room if roomId is invalid
        setRoomInfo({
          room: r,
          roomTimeline: null,
          eventId: null,
        });
      }
    };

    navigation.on(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    };
  }, [roomInfo, mx]);

  const { room, roomTimeline, eventId } = roomInfo;
  if (roomTimeline === null) {
    setTimeout(() => openNavigation());
    return <Welcome />;
  }

  return (
    <div className="room">
      <div className="room__content">
        <RoomSettings roomId={roomTimeline.roomId} />
        <RoomView room={room} roomTimeline={roomTimeline} eventId={eventId} />
      </div>

      {screenSize === ScreenSize.Desktop && isDrawer && (
        <>
          <Line variant="Background" direction="Vertical" size="300" />
          <MembersDrawer room={room} />
        </>
      )}
    </div>
  );
}

export default Room;
