import React, { useRef } from 'react';
import { Badge, Box, color, Header, Scroll, Text, toRem } from 'folds';
import { useCallEmbed, useCallJoined, useSyncCallEmbedPlacement } from '../../hooks/useCallEmbed';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { PrescreenControls } from './PrescreenControls';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoom } from '../../hooks/useRoom';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { StateEvent } from '../../../types/matrix/room';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { CallMemberRenderer } from './CallMemberCard';
import * as css from './styles.css';

function JoinMessage({ hasParticipant }: { hasParticipant?: boolean }) {
  if (hasParticipant) return null;

  return (
    <Text style={{ margin: 'auto' }} size="L400" align="Center">
      Voice chat’s empty — Be the first to hop in!
    </Text>
  );
}

function NoPermissionMessage() {
  return (
    <Text style={{ margin: 'auto' }} size="L400" align="Center">
      You don&#39;t have permission to join!
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

  const callSession = useCallSession(room);
  const callMembers = useCallMembers(room, callSession);
  const hasParticipant = callMembers.length > 0;

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
    >
      {!currentJoined && (
        <Scroll variant="Surface" hideTrack>
          <Box className={css.CallViewContent} alignItems="Center" justifyContent="Center">
            <Box style={{ maxWidth: toRem(382), width: '100%' }} direction="Column" gap="100">
              {hasParticipant && (
                <Header size="300">
                  <Box grow="Yes" alignItems="Center">
                    <Text size="L400">Participant</Text>
                  </Box>
                  <Badge variant="Critical" fill="Solid" size="400">
                    <Text as="span" size="L400" truncate>
                      {callMembers.length} Live
                    </Text>
                  </Badge>
                </Header>
              )}
              <CallMemberRenderer members={callMembers} />
              <PrescreenControls canJoin={canJoin} />
              <Header size="300">
                {!inOtherCall &&
                  (canJoin ? (
                    <JoinMessage hasParticipant={hasParticipant} />
                  ) : (
                    <NoPermissionMessage />
                  ))}
                {inOtherCall && <AlreadyInCallMessage />}
              </Header>
            </Box>
          </Box>
        </Scroll>
      )}
    </Box>
  );
}
