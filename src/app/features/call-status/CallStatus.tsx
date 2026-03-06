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

type CallStatusProps = {
  callEmbed: CallEmbed;
};
export function CallStatus({ callEmbed }: CallStatusProps) {
  const { room } = callEmbed;

  const callSession = useCallSession(room);
  const callMembers = useCallMembers(room, callSession);
  const screenSize = useScreenSize();
  const callJoined = useCallJoined(callEmbed);

  return (
    <Box
      className={classNames(css.CallStatus, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      gap="400"
      alignItems="Center"
      direction={screenSize === ScreenSize.Mobile ? 'Column' : 'Row'}
    >
      <Box grow="Yes" alignItems="Inherit" gap="200">
        {callJoined && callMembers.length > 0 ? (
          <Box shrink="No" gap="Inherit" alignItems="Inherit">
            <MemberGlance room={room} members={callMembers} />
            <LiveChip count={callMembers.length} room={room} members={callMembers} />
          </Box>
        ) : (
          <Spinner variant="Secondary" size="200" />
        )}
        <StatusDivider />
        <CallRoomName room={room} />
      </Box>
      <Box shrink="No" alignItems="Inherit" gap="Inherit">
        <CallControl callEmbed={callEmbed} />
      </Box>
    </Box>
  );
}
