import React, { MouseEventHandler, useState } from 'react';
import { Box, config, Icon, Icons, Menu, PopOut, RectCords, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarAvatar, SidebarItem, SidebarItemTooltip } from '../../../components/sidebar';
import { stopPropagation } from '../../../utils/keyboard';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import {
  encodeSearchParamValueArray,
  getCreatePath,
  getSpacePath,
  withSearchParam,
} from '../../pathUtils';
import { useCreateSelected } from '../../../hooks/router/useCreateSelected';
import { JoinAddressPrompt } from '../../../components/join-address-prompt';
import { _RoomSearchParams } from '../../paths';

export function CreateTab() {
  const { t } = useTranslation('sidebar');
  const createSelected = useCreateSelected();

  const navigate = useNavigate();
  const [menuCords, setMenuCords] = useState<RectCords>();
  const [joinAddress, setJoinAddress] = useState(false);

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(menuCords ? undefined : evt.currentTarget.getBoundingClientRect());
  };

  const handleCreateSpace = () => {
    navigate(getCreatePath());
    setMenuCords(undefined);
  };

  const handleJoinWithAddress = () => {
    setJoinAddress(true);
    setMenuCords(undefined);
  };

  return (
    <SidebarItem active={createSelected}>
      <SidebarItemTooltip tooltip={t('addSpaceTooltip', { defaultValue: 'Add Space' })}>
        {(triggerRef) => (
          <PopOut
            anchor={menuCords}
            position="Right"
            align="Center"
            content={
              <FocusTrap
                focusTrapOptions={{
                  returnFocusOnDeactivate: false,
                  initialFocus: false,
                  onDeactivate: () => setMenuCords(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                  isKeyBackward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Menu>
                  <Box direction="Column">
                    <SequenceCard
                      style={{ padding: config.space.S300 }}
                      variant="Surface"
                      direction="Column"
                      gap="100"
                      radii="0"
                      as="button"
                      type="button"
                      onClick={handleCreateSpace}
                    >
                      <SettingTile before={<Icon size="400" src={Icons.Space} />}>
                        <Text size="H6">
                          {t('createSpaceTitle', { defaultValue: 'Create Space' })}
                        </Text>
                        <Text size="T300" priority="300">
                          {t('createSpaceDescription', {
                            defaultValue: 'Build a space for your community.',
                          })}
                        </Text>
                      </SettingTile>
                    </SequenceCard>
                    <SequenceCard
                      style={{ padding: config.space.S300 }}
                      variant="Surface"
                      direction="Column"
                      gap="100"
                      radii="0"
                      as="button"
                      type="button"
                      onClick={handleJoinWithAddress}
                    >
                      <SettingTile before={<Icon size="400" src={Icons.Link} />}>
                        <Text size="H6">
                          {t('joinWithAddressTitle', { defaultValue: 'Join with Address' })}
                        </Text>
                        <Text size="T300" priority="300">
                          {t('joinWithAddressDescription', {
                            defaultValue: 'Become a part of existing community.',
                          })}
                        </Text>
                      </SettingTile>
                    </SequenceCard>
                  </Box>
                </Menu>
              </FocusTrap>
            }
          >
            <SidebarAvatar
              className={menuCords ? ContainerColor({ variant: 'Surface' }) : undefined}
              as="button"
              ref={triggerRef}
              outlined
              onClick={handleMenu}
            >
              <Icon src={Icons.Plus} />
            </SidebarAvatar>
            {joinAddress && (
              <JoinAddressPrompt
                onCancel={() => setJoinAddress(false)}
                onOpen={(roomIdOrAlias, viaServers) => {
                  setJoinAddress(false);
                  const path = getSpacePath(roomIdOrAlias);
                  navigate(
                    viaServers
                      ? withSearchParam<_RoomSearchParams>(path, {
                          viaServers: encodeSearchParamValueArray(viaServers),
                        })
                      : path
                  );
                }}
              />
            )}
          </PopOut>
        )}
      </SidebarItemTooltip>
    </SidebarItem>
  );
}
