import React from 'react';
import { Box, color, Spinner, Switch, Text } from 'folds';
import { JoinRule, MatrixError } from 'matrix-js-sdk';
import { RoomJoinRulesEventContent } from 'matrix-js-sdk/lib/types';
import { useTranslation } from 'react-i18next';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomDirectoryVisibility } from '../../../hooks/useRoomDirectoryVisibility';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { StateEvent } from '../../../../types/matrix/room';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useStateEvent } from '../../../hooks/useStateEvent';
import { ExtendedJoinRules } from '../../../components/JoinRulesSwitcher';
import { RoomPermissionsAPI } from '../../../hooks/useRoomPermissions';

type RoomPublishProps = {
  permissions: RoomPermissionsAPI;
};
export function RoomPublish({ permissions }: RoomPublishProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();

  const canEditCanonical = permissions.stateEvent(
    StateEvent.RoomCanonicalAlias,
    mx.getSafeUserId()
  );
  const joinRuleEvent = useStateEvent(room, StateEvent.RoomJoinRules);
  const content = joinRuleEvent?.getContent<RoomJoinRulesEventContent>();
  const rule: ExtendedJoinRules = (content?.join_rule as ExtendedJoinRules) ?? JoinRule.Invite;

  const { visibilityState, setVisibility } = useRoomDirectoryVisibility(room.roomId);

  const [toggleState, toggleVisibility] = useAsyncCallback(setVisibility);

  const loading =
    visibilityState.status === AsyncStatus.Loading || toggleState.status === AsyncStatus.Loading;
  const validRule =
    rule === JoinRule.Public || rule === JoinRule.Knock || rule === 'knock_restricted';

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title={t('roomSettings.publishToDirectory')}
        description={
          room.isSpaceRoom()
            ? t('roomSettings.publishSpaceDesc')
            : t('roomSettings.publishRoomDesc')
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
            {(visibilityState.error as MatrixError).message}
          </Text>
        )}

        {toggleState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T200">
            {(toggleState.error as MatrixError).message}
          </Text>
        )}
      </SettingTile>
    </SequenceCard>
  );
}
