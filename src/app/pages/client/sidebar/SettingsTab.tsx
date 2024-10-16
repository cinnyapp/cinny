import React, { useEffect, useState } from 'react';
import { Modal, Overlay, OverlayBackdrop, OverlayCenter, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar } from '../../../components/sidebar';
import { UserAvatar } from '../../../components/user-avatar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { Settings } from '../../../features/settings';
import { stopPropagation } from '../../../utils/keyboard';

type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
};
const useUserProfile = (userId: string): UserProfile => {
  const mx = useMatrixClient();

  const [profile, setProfile] = useState<UserProfile>(() => {
    const user = mx.getUser(userId);
    return {
      avatarUrl: user?.avatarUrl,
      displayName: user?.displayName,
    };
  });

  useEffect(() => {
    const user = mx.getUser(userId);
    const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        avatarUrl: myUser.avatarUrl,
      }));
    };
    const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        displayName: myUser.displayName,
      }));
    };

    mx.getProfileInfo(userId).then((info) =>
      setProfile({
        avatarUrl: info.avatar_url,
        displayName: info.displayname,
      })
    );

    user?.on(UserEvent.AvatarUrl, onAvatarChange);
    user?.on(UserEvent.DisplayName, onDisplayNameChange);
    return () => {
      user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
      user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
    };
  }, [mx, userId]);

  return profile;
};

export function SettingsTab() {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId()!;
  const profile = useUserProfile(userId);

  const [settings, setSettings] = useState(false);

  const displayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  const openSettings = () => setSettings(true);
  const closeSettings = () => setSettings(false);

  return (
    <SidebarItem active={settings}>
      <SidebarItemTooltip tooltip={displayName}>
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} onClick={openSettings}>
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              renderFallback={() => <Text size="H4">{nameInitials(displayName)}</Text>}
            />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {settings && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                clickOutsideDeactivates: true,
                onDeactivate: closeSettings,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal size="500" variant="Background">
                <Settings requestClose={closeSettings} />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </SidebarItem>
  );
}
