import React, { useRef } from 'react';
import { Box, color, Header, Text, toRem } from 'folds';
import { useCallEmbed, useCallJoined, useSyncCallEmbedPlacement } from '../../hooks/useCallEmbed';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { PrescreenControls } from './PrescreenControls';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { StateEvent } from '../../../types/matrix/room';

function JoinMessage({ canJoin }: { canJoin?: boolean }) {
  return (
    <Text style={{ margin: 'auto' }} size="L400" align="Center">
      {canJoin
        ? 'Voice chat’s empty — Be the first to hop in!'
        : "You don't have permission to join!"}
    </Text>
  );
}

function AlreadyInCallMessage() {
  return (
    <Text style={{ margin: 'auto', color: color.Warning.Main }} size="L400" align="Center">
      Already in another call — End the current call to join!
    </Text>
  );
}

export function CallView() {
  const mx = useMatrixClient();
  const room = useRoom();

  const callViewRef = useRef<HTMLDivElement>(null);
  useSyncCallEmbedPlacement(callViewRef);

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canJoin = permissions.event(StateEvent.GroupCallMemberPrefix, mx.getSafeUserId());

  const callEmbed = useCallEmbed();
  const callJoined = useCallJoined(callEmbed);
  const inOtherCall = callEmbed && callEmbed.roomId !== room.roomId;

  const currentJoined = callEmbed?.roomId === room.roomId && callJoined;

  return (
    <Box
      ref={callViewRef}
      className={ContainerColor({ variant: 'Surface' })}
      style={{ minWidth: toRem(280) }}
      grow="Yes"
      justifyContent="Center"
      alignItems="Center"
    >
      {!currentJoined && (
        <Box style={{ maxWidth: toRem(382), width: '100%' }} direction="Column" gap="100">
          <Header size="300">
            {inOtherCall ? <AlreadyInCallMessage /> : <JoinMessage canJoin={canJoin} />}
          </Header>
          <PrescreenControls canJoin={canJoin} />
        </Box>
      )}
    </Box>
  );
}
