import React, { useRef } from 'react';
import { Box, Header, Text } from 'folds';
import { useSyncCallEmbedPlacement } from '../../hooks/useCallEmbed';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { PrescreenControls } from './PrescreenControls';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { StateEvent } from '../../../types/matrix/room';

function HeaderJoinMessage({ canJoin }: { canJoin?: boolean }) {
  return (
    <Text style={{ margin: 'auto' }} size="L400" align="Center">
      {canJoin
        ? 'Voice chat’s empty — be the first to hop in!'
        : "You don't have permission to join!"}
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

  return (
    <Box
      ref={callViewRef}
      className={ContainerColor({ variant: 'Surface' })}
      grow="Yes"
      justifyContent="Center"
      alignItems="Center"
    >
      <Box direction="Column" gap="100">
        <Header size="300">
          <HeaderJoinMessage canJoin={canJoin} />
        </Header>
        <PrescreenControls canJoin={canJoin} />
      </Box>
    </Box>
  );
}
