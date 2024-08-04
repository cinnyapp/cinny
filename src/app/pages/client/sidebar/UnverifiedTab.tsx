import React from 'react';
import { Badge, color, Icon, Icons, Text } from 'folds';
import { openSettings } from '../../../../client/action/navigation';
import { isCrossVerified } from '../../../../util/matrixUtil';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { useDeviceList } from '../../../hooks/useDeviceList';
import { tabText } from '../../../organisms/settings/Settings';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import * as css from './UnverifiedTab.css';

export function UnverifiedTab() {
  const mx = useMatrixClient();
  const deviceList = useDeviceList();
  const unverified = deviceList?.filter(
    (device) => isCrossVerified(mx, device.device_id) === false
  );

  if (!unverified?.length) return null;

  return (
    <SidebarItem className={css.UnverifiedTab}>
      <SidebarItemTooltip tooltip="Unverified Sessions">
        {(triggerRef) => (
          <SidebarAvatar
            className={css.UnverifiedAvatar}
            as="button"
            ref={triggerRef}
            outlined
            onClick={() => openSettings(tabText.SECURITY)}
          >
            <Icon style={{ color: color.Critical.Main }} src={Icons.ShieldUser} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      <SidebarItemBadge hasCount>
        <Badge variant="Critical" size="400" fill="Solid" radii="Pill" outlined={false}>
          <Text as="span" size="L400">
            {unverified.length}
          </Text>
        </Badge>
      </SidebarItemBadge>
    </SidebarItem>
  );
}
