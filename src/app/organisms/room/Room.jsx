import React, { useState, useEffect } from 'react';
import './Room.scss';
import { JitsiMeeting } from '@jitsi/react-sdk';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import RoomTimeline from '../../../client/state/RoomTimeline';
import navigation from '../../../client/state/navigation';
import { openNavigation } from '../../../client/action/navigation';

import Welcome from '../welcome/Welcome';
import RoomView from './RoomView';
import RoomSettings from './RoomSettings';
import PeopleDrawer from './PeopleDrawer';
import { getUsername } from '../../../util/matrixUtil';

function Room() {
  const [roomInfo, setRoomInfo] = useState({
    roomTimeline: null,
    eventId: null,
  });
  const [isDrawer, setIsDrawer] = useState(settings.isPeopleDrawer);

  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleRoomSelected = (rId, pRoomId, eId) => {
      roomInfo.roomTimeline?.removeInternalListeners();
      if (mx.getRoom(rId)) {
        setRoomInfo({
          roomTimeline: new RoomTimeline(rId),
          eventId: eId ?? null,
        });
      } else {
        // TODO: add ability to join room if roomId is invalid
        setRoomInfo({
          roomTimeline: null,
          eventId: null,
        });
      }
    };

    navigation.on(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    };
  }, [roomInfo]);

  useEffect(() => {
    const handleDrawerToggling = (visiblity) => setIsDrawer(visiblity);
    settings.on(cons.events.settings.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);
    return () => {
      settings.removeListener(cons.events.settings.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);
    };
  }, []);

  const { roomTimeline, eventId } = roomInfo;
  if (roomTimeline === null) {
    setTimeout(() => openNavigation());
    return <Welcome />;
  }

  if (
    roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic ===
    'd38dd491fefa1cfffc27f9c57f2bdb4a'
  ) {
    return (
      <JitsiMeeting
        domain="meet.calyx.net"
        roomName={`${roomTimeline.roomName} ${roomTimeline.roomId.replace(':matrix.org', '')}`}
        configOverwrite={{
          disableReactions: true,
          disablePolls: true,
          prejoinConfig: { enabled: false },
          liveStreaming: { enabled: false },

          constraints: {
            video: {
              height: {
                ideal: 1080,
                max: 2160,
                min: 720,
              },
            },
          },
          maxBitratesVideo: {
            H264: {
              low: 200000,
              standard: 500000,
              high: 1500000,
            },
            VP8: {
              low: 200000,
              standard: 500000,
              high: 1500000,
            },
            VP9: {
              low: 100000,
              standard: 300000,
              high: 1200000,
            },
          },
          desktopSharingFrameRate: {
            min: 30,
            max: 60,
          },
          resolution: 1080,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        userInfo={{
          displayName: getUsername(mx.getUserId()),
        }}
        onApiReady={(externalApi) => {
          // here you can attach custom event listeners to the Jitsi Meet External API
          // you can also store it locally to execute commands
        }}
      />
    );
  }

  return (
    <div className="room">
      <div className="room__content">
        <RoomSettings roomId={roomTimeline.roomId} />
        <RoomView roomTimeline={roomTimeline} eventId={eventId} />
      </div>
      {isDrawer && <PeopleDrawer roomId={roomTimeline.roomId} />}
    </div>
  );
}

export default Room;
