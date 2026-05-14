/* eslint-disable react/no-array-index-key */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Chip, config, Icon, Icons, Menu, Spinner, Text } from 'folds';
import produce from 'immer';
import { useTranslation } from 'react-i18next';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import {
  applyPermissionPower,
  getPermissionPower,
  IPowerLevels,
  PermissionLocation,
} from '../../../hooks/usePowerLevels';
import { PermissionGroup } from './types';
import { getPowerLevelTag, getPowers, usePowerLevelTags } from '../../../hooks/usePowerLevelTags';
import { useRoom } from '../../../hooks/useRoom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { StateEvent } from '../../../../types/matrix/room';
import { PowerSwitcher } from '../../../components/power';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAlive } from '../../../hooks/useAlive';

const USER_DEFAULT_LOCATION: PermissionLocation = {
  user: true,
};

type PermissionGroupsProps = {
  canEdit: boolean;
  powerLevels: IPowerLevels;
  permissionGroups: PermissionGroup[];
};
export function PermissionGroups({
  powerLevels,
  permissionGroups,
  canEdit,
}: PermissionGroupsProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const alive = useAlive();

  const powerLevelTags = usePowerLevelTags(room, powerLevels);
  const maxPower = useMemo(() => Math.max(...getPowers(powerLevelTags)), [powerLevelTags]);

  const [permissionUpdate, setPermissionUpdate] = useState<Map<PermissionLocation, number>>(
    new Map()
  );

  useEffect(() => {
    // reset permission update if component rerender
    // as permission location object reference has changed
    setPermissionUpdate(new Map());
  }, [permissionGroups]);

  const handleChangePermission = (
    location: PermissionLocation,
    newPower: number,
    currentPower: number
  ) => {
    setPermissionUpdate((p) => {
      const up: typeof p = new Map();
      p.forEach((value, key) => {
        up.set(key, value);
      });
      if (newPower === currentPower) {
        up.delete(location);
      } else {
        up.set(location, newPower);
      }
      return up;
    });
  };

  const [applyState, applyChanges] = useAsyncCallback(
    useCallback(async () => {
      const editedPowerLevels = produce(powerLevels, (draftPowerLevels) => {
        permissionGroups.forEach((group) =>
          group.items.forEach((item) => {
            const power = getPermissionPower(powerLevels, item.location);
            applyPermissionPower(draftPowerLevels, item.location, power);
          })
        );
        permissionUpdate.forEach((power, location) =>
          applyPermissionPower(draftPowerLevels, location, power)
        );

        return draftPowerLevels;
      });
      await mx.sendStateEvent(room.roomId, StateEvent.RoomPowerLevels as any, editedPowerLevels);
    }, [mx, room, powerLevels, permissionUpdate, permissionGroups])
  );

  const resetChanges = useCallback(() => {
    setPermissionUpdate(new Map());
  }, []);

  const handleApplyChanges = () => {
    applyChanges().then(() => {
      if (alive()) {
        resetChanges();
      }
    });
  };

  const applyingChanges = applyState.status === AsyncStatus.Loading;
  const hasChanges = permissionUpdate.size > 0;

  const renderUserGroup = () => {
    const power = getPermissionPower(powerLevels, USER_DEFAULT_LOCATION);
    const powerUpdate = permissionUpdate.get(USER_DEFAULT_LOCATION);
    const value = powerUpdate ?? power;

    const tag = getPowerLevelTag(powerLevelTags, value);
    const powerChanges = value !== power;

    return (
      <Box direction="Column" gap="100">
        <Text size="L400">{t('roomSettings.users')}</Text>
        <SequenceCard
          variant="SurfaceVariant"
          className={SequenceCardStyle}
          direction="Column"
          gap="400"
        >
          <SettingTile
            title={t('roomSettings.defaultPower')}
            description={t('roomSettings.defaultPowerDesc')}
            after={
              <PowerSwitcher
                powerLevelTags={powerLevelTags}
                value={value}
                onChange={(v) => handleChangePermission(USER_DEFAULT_LOCATION, v, power)}
              >
                {(handleOpen, opened) => (
                  <Chip
                    variant={powerChanges ? 'Success' : 'Secondary'}
                    outlined={powerChanges}
                    fill="Soft"
                    radii="Pill"
                    aria-selected={opened}
                    disabled={!canEdit || applyingChanges}
                    after={
                      powerChanges && (
                        <Badge size="200" variant="Success" fill="Solid" radii="Pill" />
                      )
                    }
                    before={
                      canEdit && (
                        <Icon size="50" src={opened ? Icons.ChevronTop : Icons.ChevronBottom} />
                      )
                    }
                    onClick={handleOpen}
                  >
                    <Text size="B300" truncate>
                      {tag.name}
                    </Text>
                  </Chip>
                )}
              </PowerSwitcher>
            }
          />
        </SequenceCard>
      </Box>
    );
  };

  return (
    <>
      {renderUserGroup()}
      {permissionGroups.map((group, groupIndex) => (
        <Box key={groupIndex} direction="Column" gap="100">
          <Text size="L400">{group.name}</Text>
          {group.items.map((item, itemIndex) => {
            const power = getPermissionPower(powerLevels, item.location);
            const powerUpdate = permissionUpdate.get(item.location);
            const value = powerUpdate ?? power;

            const tag = getPowerLevelTag(powerLevelTags, value);
            const powerChanges = value !== power;

            return (
              <SequenceCard
                key={itemIndex}
                variant="SurfaceVariant"
                className={SequenceCardStyle}
                direction="Column"
                gap="400"
              >
                <SettingTile
                  title={item.name}
                  description={item.description}
                  after={
                    <PowerSwitcher
                      powerLevelTags={powerLevelTags}
                      value={value}
                      onChange={(v) => handleChangePermission(item.location, v, power)}
                    >
                      {(handleOpen, opened) => (
                        <Chip
                          variant={powerChanges ? 'Success' : 'Secondary'}
                          outlined={powerChanges}
                          fill="Soft"
                          radii="Pill"
                          aria-selected={opened}
                          disabled={!canEdit || applyingChanges}
                          after={
                            powerChanges && (
                              <Badge size="200" variant="Success" fill="Solid" radii="Pill" />
                            )
                          }
                          before={
                            canEdit && (
                              <Icon
                                size="50"
                                src={opened ? Icons.ChevronTop : Icons.ChevronBottom}
                              />
                            )
                          }
                          onClick={handleOpen}
                        >
                          <Text size="B300" truncate>
                            {tag.name}
                          </Text>
                          {value < maxPower && <Text size="T200">{t('roomSettings.above')}</Text>}
                        </Chip>
                      )}
                    </PowerSwitcher>
                  }
                />
              </SequenceCard>
            );
          })}
        </Box>
      ))}

      {hasChanges && (
        <Menu
          style={{
            position: 'sticky',
            padding: config.space.S200,
            paddingLeft: config.space.S400,
            bottom: config.space.S400,
            left: config.space.S400,
            right: 0,
            zIndex: 1,
          }}
          variant="Success"
        >
          <Box alignItems="Center" gap="400">
            <Box grow="Yes" direction="Column">
              {applyState.status === AsyncStatus.Error ? (
                <Text size="T200">
                  <b>{t('roomSettings.failedApply')}</b>
                </Text>
              ) : (
                <Text size="T200">
                  <b>{t('roomSettings.changesSaved')}</b>
                </Text>
              )}
            </Box>
            <Box shrink="No" gap="200">
              <Button
                size="300"
                variant="Success"
                fill="None"
                radii="300"
                disabled={applyingChanges}
                onClick={resetChanges}
              >
                <Text size="B300">{t('roomSettings.reset')}</Text>
              </Button>
              <Button
                size="300"
                variant="Success"
                radii="300"
                disabled={applyingChanges}
                before={applyingChanges && <Spinner variant="Success" fill="Solid" size="100" />}
                onClick={handleApplyChanges}
              >
                <Text size="B300">{t('roomSettings.applyChanges')}</Text>
              </Button>
            </Box>
          </Box>
        </Menu>
      )}
    </>
  );
}
