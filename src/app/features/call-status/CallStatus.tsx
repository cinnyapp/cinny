import React from 'react';
import { Box } from 'folds';
import { Room } from 'matrix-js-sdk';
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

type CallStatusProps = {
  room: Room;
};
export function CallStatus({ room }: CallStatusProps) {
  const callSession = useCallSession(room);
  const callMembers = useCallMembers(room, callSession);
  const screenSize = useScreenSize();

  return (
    <Box
      className={classNames(css.CallStatus, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      gap="400"
      alignItems="Center"
      direction={screenSize === ScreenSize.Mobile ? 'Column' : 'Row'}
    >
      <Box grow="Yes" alignItems="Inherit" gap="200">
        <Box shrink="No" gap="Inherit" alignItems="Inherit">
          <MemberGlance room={room} members={callMembers} />
          <LiveChip count={callMembers.length} room={room} members={callMembers} />
        </Box>
        <StatusDivider />
        <CallRoomName room={room} />
      </Box>
      <Box shrink="No" alignItems="Inherit" gap="Inherit">
        <CallControl />
      </Box>
    </Box>
  );
}
