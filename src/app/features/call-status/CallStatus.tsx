import React, { useMemo } from 'react';
import { Box, Spinner } from 'folds';
import classNames from 'classnames';
import { LiveChip } from './LiveChip';
import * as css from './styles.css';
import { CallRoomName } from './CallRoomName';
import { CallControl } from './CallControl';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { ScreenSize, useScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { MemberGlance } from './MemberGlance';
import { StatusDivider } from './components';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallEmbed, useCallJoined } from '../../hooks/useCallEmbed';
import { useCallSpeakers } from '../../hooks/useCallSpeakers';
import { MemberSpeaking } from './MemberSpeaking';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { useRoomMembers } from '../../hooks/useRoomMembers';

type CallStatusProps = {
  callEmbed: CallEmbed;
};
export function CallStatus({ callEmbed }: CallStatusProps) {
  const { roomId } = callEmbed;

  const callSession = useCallSession(roomId);
  const callMembers = useCallMembers(callSession);
  const users = useMemo(() => Array.from(new Set(callMembers.map((m) => m.userId))), [callMembers]);
  const membersAPI = useRoomMembers(roomId, users);

  const screenSize = useScreenSize();
  const callJoined = useCallJoined(callEmbed);
  const speakers = useCallSpeakers(callEmbed);

  const compact = screenSize === ScreenSize.Mobile;

  const memberVisible = callJoined && callMembers.length > 0;

  return (
    <Box
      className={classNames(css.CallStatus, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      gap="400"
      alignItems={compact ? undefined : 'Center'}
      direction={compact ? 'Column' : 'Row'}
    >
      <Box grow="Yes" alignItems="Center" gap="200">
        {memberVisible ? (
          <Box shrink="No">
            <LiveChip count={users.length} roomId={roomId} users={users} membersAPI={membersAPI} />
          </Box>
        ) : (
          <Spinner variant="Secondary" size="200" />
        )}
        <Box grow="Yes" alignItems="Center" gap="Inherit">
          {!compact && (
            <>
              <CallRoomName roomId={roomId} />
              {speakers.size > 0 && (
                <>
                  <StatusDivider />
                  <span data-spacing-node />
                  <MemberSpeaking membersAPI={membersAPI} speakers={speakers} />
                </>
              )}
            </>
          )}
        </Box>
        {memberVisible && (
          <Box shrink="No">
            <MemberGlance
              roomId={roomId}
              users={users}
              membersAPI={membersAPI}
              speakers={speakers}
            />
          </Box>
        )}
      </Box>
      {memberVisible && !compact && <StatusDivider />}
      <Box shrink="No" alignItems="Center" gap="Inherit">
        {compact && (
          <Box grow="Yes">
            <CallRoomName roomId={roomId} />
          </Box>
        )}
        <CallControl callJoined={callJoined} compact={compact} callEmbed={callEmbed} />
      </Box>
    </Box>
  );
}

export function CallStatusRenderer() {
  const callEmbed = useCallEmbed();
  const selectedRoom = useSelectedRoom();

  const screenSize = useScreenSizeContext();

  if (!callEmbed) return null;

  if (screenSize === ScreenSize.Mobile && callEmbed.roomId === selectedRoom) return null;

  return <CallStatus callEmbed={callEmbed} />;
}
