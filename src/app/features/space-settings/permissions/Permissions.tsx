import React, { useState } from 'react';
import { Box, Icon, IconButton, Icons, Scroll, Text } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { useRoom } from '../../../hooks/useRoom';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';
import { StateEvent } from '../../../../types/matrix/room';
import { usePermissionGroups } from './usePermissionItems';
import { PermissionGroups, Powers, PowersEditor } from '../../common-settings/permissions';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';
import { useClient } from '../../../hooks/useClient';

type PermissionsProps = {
  requestClose: () => void;
};
export function Permissions({ requestClose }: PermissionsProps) {
  const ct = useClient();
  const roomId = useRoom();
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(roomId);

  const permissions = useRoomPermissions(creators, powerLevels);

  const canEditPowers = permissions.stateEvent(StateEvent.PowerLevelTags, ct.session.userId);
  const canEditPermissions = permissions.stateEvent(StateEvent.RoomPowerLevels, ct.session.userId);
  const permissionGroups = usePermissionGroups();

  const [powerEditor, setPowerEditor] = useState(false);

  const handleEditPowers = () => {
    setPowerEditor(true);
  };

  if (canEditPowers && powerEditor) {
    return <PowersEditor requestClose={() => setPowerEditor(false)} />;
  }

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Permissions
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Powers
                onEdit={canEditPowers ? handleEditPowers : undefined}
                permissionGroups={permissionGroups}
              />
              <PermissionGroups canEdit={canEditPermissions} permissionGroups={permissionGroups} />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
