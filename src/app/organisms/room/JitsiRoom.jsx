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

const TOPIC_JITSI_CALL = 'd38dd491fefa1cfffc27f9c57f2bdb4a'

function JitsiRoom({ setIsJitsiRoom }) {
  const [jitsiCallId, setJitsiCallId] = useState(null);

  const [roomInfo, setRoomInfo] = useState({
    roomTimeline: null,
    eventId: null,
  });
  const [roomName, setRoomName] = useState('');
  const [counter, setCounter] = useState(0);
  const openerRef = useRef(null);

  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleRoomSelected = (rId, pRoomId, eId) => {
      roomInfo.roomTimeline?.removeInternalListeners();
      const roomTimeline = new RoomTimeline(rId);
      const topic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic

      if (mx.getRoom(rId) && topic === TOPIC_JITSI_CALL && jitsiCallId !== rId) {
        if (confirm('Do you want to join this call?')) {
          setJitsiCallId(rId);
          setRoomName(roomTimeline.roomName);
          setRoomInfo({
            roomTimeline,
            eventId: eId ?? null,
          });
          setCounter(counter + 1);
        } else if (!jitsiCallId) {
          setRoomInfo({
            roomTimeline: null,
            eventId: null,
          });
        }
      }

      setIsJitsiRoom(topic === TOPIC_JITSI_CALL)
    };

    navigation.on(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    };
  }, [roomInfo]);

  const { roomTimeline } = roomInfo;
  if (roomTimeline === null) {
    setTimeout(() => openNavigation());
    return null;
  }

  if (jitsiCallId) {
    return (
      <div className="call">
        <div className="call_header" id="header" ref={openerRef}>
          {roomName}
        </div>
        <Button
          onClick={() => {
            setJitsiCallId(null);
            setRoomName('');
            setRoomInfo({
              roomTimeline: null,
              eventId: null,
            });
          }}
        >
          X
        </Button>
        <Button>Return</Button>
        <JitsiMeeting
          key={counter}
          domain="meet.calyx.net"
          roomName={`${roomName} ${roomTimeline.roomId.replace(':matrix.org', '')}`}
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
  return null;
}

export default JitsiRoom;
