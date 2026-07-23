import React from 'react';
import { Box, color, Spinner, Switch, Text } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomDirectoryVisibility } from '../../../hooks/useRoomDirectoryVisibility';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { JoinRule, StateEventType } from '../../../../types/matrix/room';
import { RoomPermissionsAPI } from '../../../hooks/useRoomPermissions';
import { useClient } from '../../../hooks/useClient';
import { useObservableValue } from '../../../hooks/useObservableValue';

type RoomPublishProps = {
  permissions: RoomPermissionsAPI;
};
export function RoomPublish({ permissions }: RoomPublishProps) {
  const ct = useClient();
  const roomId = useRoom();

  const canEditCanonical = permissions.stateEvent(
    StateEventType.RoomCanonicalAlias,
    ct.session.userId
  );
  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);
  const rule: JoinRule = roomToJoinRule.get(roomId) ?? 'invite';

  const { visibilityState, setVisibility } = useRoomDirectoryVisibility(roomId);

  const [toggleState, toggleVisibility] = useAsyncCallback(setVisibility);

  const loading =
    visibilityState.status === AsyncStatus.Loading || toggleState.status === AsyncStatus.Loading;
  const validRule = rule === 'public' || rule === 'knock' || rule === 'knock_restricted';

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title="Publish to Directory"
        description={
          ct.spaceRooms.read.has(roomId)
            ? 'List the space in the public directory to make it discoverable by others.'
            : 'List the room in the public directory to make it discoverable by others.'
        }
        after={
          <Box gap="200" alignItems="Center">
            {loading && <Spinner variant="Secondary" />}
            {!loading && visibilityState.status === AsyncStatus.Success && (
              <Switch
                value={visibilityState.data}
                onChange={toggleVisibility}
                disabled={!canEditCanonical || !validRule}
              />
            )}
          </Box>
        }
      >
        {visibilityState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T200">
            {visibilityState.error instanceof Error
              ? visibilityState.error.message
              : 'Unknown Error'}
          </Text>
        )}

        {toggleState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T200">
            {toggleState.error instanceof Error ? toggleState.error.message : 'Unknown Error'}
          </Text>
        )}
      </SettingTile>
    </SequenceCard>
  );
}
