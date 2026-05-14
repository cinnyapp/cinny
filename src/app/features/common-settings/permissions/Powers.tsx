/* eslint-disable react/no-array-index-key */
import React, { useState, MouseEventHandler, ReactNode } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Button,
  Chip,
  Text,
  RectCords,
  PopOut,
  Menu,
  Scroll,
  toRem,
  config,
  color,
} from 'folds';
import { useTranslation } from 'react-i18next';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { getPowers, usePowerLevelTags } from '../../../hooks/usePowerLevelTags';
import { SettingTile } from '../../../components/setting-tile';
import { getPermissionPower, IPowerLevels } from '../../../hooks/usePowerLevels';
import { useRoom } from '../../../hooks/useRoom';
import { PowerColorBadge, PowerIcon } from '../../../components/power';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { stopPropagation } from '../../../utils/keyboard';
import { PermissionGroup } from './types';
import { getPowerTagIconSrc } from '../../../hooks/useMemberPowerTag';
import { useRoomCreatorsTag } from '../../../hooks/useRoomCreatorsTag';
import { useRoomCreators } from '../../../hooks/useRoomCreators';

type PeekPermissionsProps = {
  powerLevels: IPowerLevels;
  power: number;
  permissionGroups: PermissionGroup[];
  children: (handleOpen: MouseEventHandler<HTMLButtonElement>, opened: boolean) => ReactNode;
};
function PeekPermissions({ powerLevels, power, permissionGroups, children }: PeekPermissionsProps) {
  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleOpen: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <PopOut
      anchor={menuCords}
      offset={5}
      position="Bottom"
      align="Center"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setMenuCords(undefined),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu
            style={{
              maxHeight: '75vh',
              maxWidth: toRem(300),
              display: 'flex',
            }}
          >
            <Box grow="Yes" tabIndex={0}>
              <Scroll size="0" hideTrack visibility="Hover">
                <Box style={{ padding: config.space.S200 }} direction="Column" gap="400">
                  {permissionGroups.map((group, groupIndex) => (
                    <Box key={groupIndex} direction="Column" gap="100">
                      <Text size="L400">{group.name}</Text>
                      <div>
                        {group.items.map((item, itemIndex) => {
                          const requiredPower = getPermissionPower(powerLevels, item.location);
                          const hasPower = requiredPower <= power;

                          return (
                            <Text
                              key={itemIndex}
                              size="T200"
                              style={{
                                color: hasPower ? undefined : color.Critical.Main,
                              }}
                            >
                              {hasPower ? '✅' : '❌'} {item.name}
                            </Text>
                          );
                        })}
                      </div>
                    </Box>
                  ))}
                </Box>
              </Scroll>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      {children(handleOpen, !!menuCords)}
    </PopOut>
  );
}

type PowersProps = {
  powerLevels: IPowerLevels;
  permissionGroups: PermissionGroup[];
  onEdit?: () => void;
};
export function Powers({ powerLevels, permissionGroups, onEdit }: PowersProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const room = useRoom();
  const powerLevelTags = usePowerLevelTags(room, powerLevels);
  const creators = useRoomCreators(room);
  const creatorsTag = useRoomCreatorsTag();
  const creatorTagIconSrc =
    creatorsTag.icon && getPowerTagIconSrc(mx, useAuthentication, creatorsTag.icon);

  return (
    <Box direction="Column" gap="100">
      {creators.size > 0 && (
        <SequenceCard
          variant="SurfaceVariant"
          className={SequenceCardStyle}
          direction="Column"
          gap="400"
        >
          <SettingTile
            title={t('roomSettings.founders')}
            description={t('roomSettings.foundersDesc')}
          />

          <SettingTile>
            <Box gap="200" wrap="Wrap">
              <Chip
                disabled
                variant="Secondary"
                radii="300"
                before={<PowerColorBadge color={creatorsTag.color} />}
                after={creatorTagIconSrc && <PowerIcon size="50" iconSrc={creatorTagIconSrc} />}
              >
                <Text size="T300" truncate>
                  <b>{creatorsTag.name}</b>
                </Text>
              </Chip>
            </Box>
          </SettingTile>
        </SequenceCard>
      )}
      <SequenceCard
        variant="SurfaceVariant"
        className={SequenceCardStyle}
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('roomSettings.powerLevels')}
          description={t('roomSettings.powerLevelsDesc')}
          after={
            onEdit && (
              <Box gap="200">
                <Button
                  variant="Secondary"
                  fill="Soft"
                  size="300"
                  radii="300"
                  outlined
                  onClick={onEdit}
                >
                  <Text size="B300">{t('roomSettings.edit')}</Text>
                </Button>
              </Box>
            )
          }
        />
        <SettingTile>
          <Box gap="200" wrap="Wrap">
            {getPowers(powerLevelTags).map((power) => {
              const tag = powerLevelTags[power];
              const tagIconSrc = tag.icon && getPowerTagIconSrc(mx, useAuthentication, tag.icon);

              return (
                <PeekPermissions
                  key={power}
                  powerLevels={powerLevels}
                  power={power}
                  permissionGroups={permissionGroups}
                >
                  {(openMenu, opened) => (
                    <Chip
                      onClick={openMenu}
                      variant="Secondary"
                      aria-pressed={opened}
                      radii="300"
                      before={<PowerColorBadge color={tag.color} />}
                      after={tagIconSrc && <PowerIcon size="50" iconSrc={tagIconSrc} />}
                    >
                      <Text size="T300" truncate>
                        <b>{tag.name}</b>
                      </Text>
                    </Chip>
                  )}
                </PeekPermissions>
              );
            })}
          </Box>
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
