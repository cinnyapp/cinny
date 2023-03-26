import React, { useState, useEffect } from 'react';
import './JitsiRoom.scss';
import { JitsiMeeting } from '@jitsi/react-sdk';
import Draggable from 'react-draggable';
import useWindowDimensions from './windowDimensions';
import SearchIC from '../../../../public/res/ic/filled/hangup_call.svg';
import { openNavigation } from '../../../client/action/navigation';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import RoomTimeline from '../../../client/state/RoomTimeline';
import navigation from '../../../client/state/navigation';
import { getUsername } from '../../../util/matrixUtil';
import Button from '../../atoms/button/Button';
import { useSelectedSpace } from '../../hooks/useSelectedSpace';

const TOPIC_JITSI_CALL = 'd38dd491fefa1cfffc27f9c57f2bdb4a';

function JitsiRoom({ isJitsiRoom, setIsJitsiRoom, jitsiCallId, setJitsiCallId }) {
  const [roomInfo, setRoomInfo] = useState({
    roomTimeline: null,
    eventId: null,
  });
  const [roomName, setRoomName] = useState('');
  const [spaceName, setSpaceName] = useState(null);
  const [counter, setCounter] = useState(0);

  const { windowDimensions, key } = useWindowDimensions();

  const mx = initMatrix.matrixClient;
  const sn = mx.getRoom(useSelectedSpace())?.name;

  useEffect(() => {
    const handleRoomSelected = (rId, pRoomId, eId) => {
      let topic = '';
      let roomTimeline = null;
      roomInfo.roomTimeline?.removeInternalListeners();

      if (mx.getRoom(rId)) {
        roomTimeline = new RoomTimeline(rId);
        topic = roomTimeline.room?.currentState
          .getStateEvents('m.room.topic')[0]
          ?.getContent().topic;
      }

      if (topic === TOPIC_JITSI_CALL && jitsiCallId !== rId) {
        setJitsiCallId(rId);
        setRoomName(roomTimeline.roomName);
        setSpaceName(sn);
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

      setIsJitsiRoom(topic === TOPIC_JITSI_CALL);
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
      <Draggable
        disabled={isJitsiRoom}
        bounds={{
          left: -windowDimensions.width * 0.5 + 90,
          top: -windowDimensions.height * 0.5 + 170,
          right: windowDimensions.width * 0.5 - 250,
          bottom: windowDimensions.height * 0.5 - 40,
        }}
        key={key}
      >
        <div className={isJitsiRoom ? 'call reset_pip' : 'pip'}>
          <div className={isJitsiRoom ? 'call_header' : 'call_header pip_header'}>
            <div className="call_room_title">
              {roomName} ({spaceName || sn})
            </div>
            <div className="call_buttons">
              <Button
                onClick={() => {
                  setJitsiCallId(null);
                  setRoomName('');
                  setSpaceName(null);
                  setRoomInfo({
                    roomTimeline: null,
                    eventId: null,
                  });
                }}
                className="close_button"
              >
                <img src={SearchIC} className="call_icon" alt="hangup" />
              </Button>
            </div>
          </div>
          <div className="call_iframe">
            <JitsiMeeting
              key={counter}
              domain="meet.calyx.net"
              roomName={`${roomName.replace(':', '')} ${(spaceName || sn)?.replace(
                ':',
                ''
              )} ${roomTimeline.roomId.replace(':matrix.org', '')}`}
              configOverwrite={{
                disableReactions: true,
                disablePolls: true,
                prejoinConfig: { enabled: false },
                liveStreaming: { enabled: false },
                maxFullResolutionParticipants: 1,
                startWithVideoMuted: true,
                disableProfile: true,
                toolbarButtons: [
                  'camera',
                  'desktop',
                  'fullscreen',
                  'invite',
                  'microphone',
                  'noisesuppression',
                  'settings',
                  'sharedvideo',
                  'shortcuts',
                  'tileview',
                  'videoquality',
                ],

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
              getIFrameRef={(iframeRef) => {
                iframeRef.style.height = '96%';
              }}
            />
          </div>
        </div>
      </Draggable>
    );
  }
  return null;
}

export default JitsiRoom;
