import React, { useEffect, useState } from 'react';
import { Text } from 'folds';
import { UserEvent, UserEventHandlerMap } from 'matrix-js-sdk';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar } from '../../../components/sidebar';
import { openSettings } from '../../../../client/action/navigation';
import { UserAvatar } from '../../../components/user-avatar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';

type UserProfile = {
  avatar_url?: string;
  displayname?: string;
};
export function UserTab() {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getUserId()!;

  const [profile, setProfile] = useState<UserProfile>({});
  const displayName = profile.displayname ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile.avatar_url
    ? mxcUrlToHttp(mx, profile.avatar_url, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  useEffect(() => {
    const user = mx.getUser(userId);
    const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        avatar_url: myUser.avatarUrl,
      }));
    };
    const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
      setProfile((cp) => ({
        ...cp,
        avatar_url: myUser.displayName,
      }));
    };
    mx.getProfileInfo(userId).then((info) => setProfile(() => ({ ...info })));
    user?.on(UserEvent.AvatarUrl, onAvatarChange);
    user?.on(UserEvent.DisplayName, onDisplayNameChange);
    return () => {
      user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
      user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
    };
  }, [mx, userId]);

  return (
    <SidebarItem>
      <SidebarItemTooltip tooltip="User Settings">
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} onClick={() => openSettings()}>
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              renderFallback={() => <Text size="H4">{nameInitials(displayName)}</Text>}
            />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
    </SidebarItem>
  );
}
