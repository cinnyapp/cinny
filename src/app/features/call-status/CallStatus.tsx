import React from 'react';
import { Box, Spinner } from 'folds';
import classNames from 'classnames';
import { LiveChip } from './LiveChip';
import * as css from './styles.css';
import { CallRoomName } from './CallRoomName';
import { CallControl } from './CallControl';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { MemberGlance } from './MemberGlance';
import { StatusDivider } from './components';
import { CallEmbed } from '../../plugins/call/CallEmbed';
import { useCallJoined } from '../../hooks/useCallEmbed';
import { useCallSpeakers } from '../../hooks/useCallSpeakers';
import { MemberSpeaking } from './MemberSpeaking';

type CallStatusProps = {
  callEmbed: CallEmbed;
};
export function CallStatus({ callEmbed }: CallStatusProps) {
  const { room } = callEmbed;

  const callSession = useCallSession(room);
  const callMembers = useCallMembers(room, callSession);
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
            <LiveChip count={callMembers.length} room={room} members={callMembers} />
          </Box>
        ) : (
          <Spinner variant="Secondary" size="200" />
        )}
        <Box
          grow="Yes"
          alignItems="Center"
          gap="Inherit"
          justifyContent={compact ? 'Center' : undefined}
        >
          <CallRoomName room={room} />
          {speakers.size > 0 && !compact && (
            <>
              <StatusDivider />
              <span data-spacing-node />
              <MemberSpeaking room={room} speakers={speakers} />
            </>
          )}
        </Box>
        {memberVisible && (
          <Box shrink="No">
            <MemberGlance room={room} members={callMembers} speakers={speakers} />
          </Box>
        )}
      </Box>
      {memberVisible && !compact && <StatusDivider />}
      <Box shrink="No" alignItems="Center" justifyContent="Center" gap="Inherit">
        <CallControl callEmbed={callEmbed} />
      </Box>
    </Box>
  );
}
