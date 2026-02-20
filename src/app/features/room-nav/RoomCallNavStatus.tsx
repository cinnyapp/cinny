import {
  Box,
  Chip,
  Icon,
  IconButton,
  Icons,
  Line,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  color,
} from 'folds';
import React from 'react';
import { useCallState } from '../../pages/client/call/CallProvider';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import * as css from './RoomCallNavStatus.css';

export function CallNavStatus() {
  const {
    activeCallRoomId,
    isActiveCallReady,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    hangUp,
  } = useCallState();
  const { navigateRoom } = useRoomNavigate();
  const hasActiveCall = Boolean(activeCallRoomId);
  const isConnected = hasActiveCall && isActiveCallReady;
  const handleGoToCallRoom = () => {
    if (activeCallRoomId) {
      navigateRoom(activeCallRoomId);
    }
  };

  return (
    <Box direction="Column" shrink="No">
      <Line variant="Surface" size="300" />
      <Box className={css.Actions} direction="Row" alignItems="Center" gap="100">
        <Box className={css.RoomButtonWrap} grow="Yes">
          {hasActiveCall && (
            <TooltipProvider
              position="Top"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>Go to Room</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <Chip
                  size="500"
                  fill="Soft"
                  as="button"
                  onClick={handleGoToCallRoom}
                  ref={triggerRef}
                  className={css.RoomButton}
                >
                  {isConnected ? (
                    <Icon size="300" src={Icons.VolumeHigh} style={{ color: color.Success.Main }} />
                  ) : (
                    <Spinner size="300" variant="Secondary" />
                  )}
                  <Text
                    as="span"
                    size="L400"
                    style={{ color: isConnected ? color.Success.Main : color.Warning.Main }}
                  >
                    {isConnected ? 'Connected' : 'Connecting'}
                  </Text>
                </Chip>
              )}
            </TooltipProvider>
          )}
        </Box>
        {hasActiveCall && (
          <TooltipProvider
            position="Top"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>Hang Up</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton fill="None" size="300" ref={triggerRef} onClick={hangUp}>
                <Icon src={Icons.PhoneDown} />
              </IconButton>
            )}
          </TooltipProvider>
        )}
        <TooltipProvider
          position="Top"
          offset={4}
          tooltip={
            <Tooltip>
              <Text>{!isAudioEnabled ? 'Unmute' : 'Mute'}</Text>
            </Tooltip>
          }
        >
          {(triggerRef) => (
            <IconButton fill="None" size="300" ref={triggerRef} onClick={toggleAudio}>
              <Icon src={!isAudioEnabled ? Icons.MicMute : Icons.Mic} />
            </IconButton>
          )}
        </TooltipProvider>
        <TooltipProvider
          position="Top"
          offset={4}
          tooltip={
            <Tooltip>
              <Text>{!isVideoEnabled ? 'Video On' : 'Video Off'}</Text>
            </Tooltip>
          }
        >
          {(triggerRef) => (
            <IconButton fill="None" size="300" ref={triggerRef} onClick={toggleVideo}>
              <Icon src={!isVideoEnabled ? Icons.VideoCameraMute : Icons.VideoCamera} />
            </IconButton>
          )}
        </TooltipProvider>
      </Box>
    </Box>
  );
}
