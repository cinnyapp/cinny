import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar } from '../../../components/sidebar';
import { UserAvatar } from '../../../components/user-avatar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { Settings } from '../../../features/settings';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { Modal500 } from '../../../components/Modal500';

export function SettingsTab() {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId() as string;
  const profile = useUserProfile(userId);

  const [settings, setSettings] = useState(false);

  const avatarUrl = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  const openSettings = () => setSettings(true);
  const closeSettings = () => setSettings(false);

  return (
    <SidebarItem active={settings}>
      <SidebarItemTooltip tooltip="User Settings">
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} onClick={openSettings}>
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              renderFallback={() => <Icon size="400" src={Icons.User} filled />}
            />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {settings && (
        <Modal500 requestClose={closeSettings}>
          <Settings requestClose={closeSettings} />
        </Modal500>
      )}
    </SidebarItem>
  );
}
