import React, { useState, useEffect, useRef } from 'react';
import './Room.scss';
import { JitsiMeeting } from '@jitsi/react-sdk';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import RoomTimeline from '../../../client/state/RoomTimeline';
import navigation from '../../../client/state/navigation';
import { openNavigation } from '../../../client/action/navigation';
import { getUsername } from '../../../util/matrixUtil';
import Button from '../../atoms/button/Button';

function JitsiRoom() {
  const [roomInfo, setRoomInfo] = useState({
    roomTimeline: null,
    eventId: null,
  });
  const [activeCall, setActiveCall] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const openerRef = useRef(null);

  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleRoomSelected = (rId, pRoomId, eId) => {
      roomInfo.roomTimeline?.removeInternalListeners();
      if (mx.getRoom(rId)) {
        const roomTimeline = new RoomTimeline(rId);
        setRoomInfo({
          roomTimeline,
          eventId: eId ?? null,
        });
        if (
          roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic ===
          'd38dd491fefa1cfffc27f9c57f2bdb4a'
        ) {
          setActiveCall(true);
        }
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
  }, [mx, roomInfo]);

  const { roomTimeline } = roomInfo;
  if (roomTimeline === null) {
    setTimeout(() => openNavigation());
    return null;
  }

  if (activeCall) {
    if (roomName === '') {
      setRoomName(roomTimeline.roomName);
    }
    return (
      <div className="call">
        <div className="call_header" id="header" ref={openerRef}>
          {roomName}
        </div>
        <Button
          onClick={() => {
            setActiveCall(false);
            setRoomName('');
          }}
        >
          X
        </Button>
        <Button>Return</Button>
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
      </div>
    );
  }

  if (!activeCall) {
    return <div className="hiddenJitsiCall" />;
  }
}

export default JitsiRoom;
