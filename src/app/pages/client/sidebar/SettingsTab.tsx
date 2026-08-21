import React, { MouseEventHandler, useState } from 'react';
import {
  Avatar,
  Box,
  config,
  Icon,
  Icons,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Text,
  toRem,
} from 'folds';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { useSetAtom } from 'jotai';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar } from '../../../components/sidebar';
import { UserAvatar } from '../../../components/user-avatar';
import { getMxIdLocalPart, getMxIdServer } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { Settings } from '../../../features/settings';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { Modal500 } from '../../../components/Modal500';
import { useClient } from '../../../hooks/useClient';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { getRootPath } from '../../pathUtils';
import { stopPropagation } from '../../../utils/keyboard';
import { useSession, useSessions } from '../../../hooks/useSessions';
import { sessionUserIdAtom } from '../../../state/sessions';
import { Session } from '../../../../client/sessions';

type AccountTileProps = {
  session: Session;
};
function AccountTile({ session }: AccountTileProps) {
  const { userId } = session;

  const currentSession = useSession();
  const currentSelected = userId === currentSession.userId;

  const setSessionUserId = useSetAtom(sessionUserIdAtom);

  const profile = useUserProfile(userId);

  const username = getMxIdLocalPart(userId) ?? userId;
  const server = getMxIdServer(userId) ?? userId;

  const displayName = profile?.displayName ?? username;
  const avatarUrl = profile?.avatarUrl
    ? mxcToHttp(session.baseUrl, profile.avatarUrl, true).thumbnail({
        width: 96,
        height: 96,
        method: 'crop',
      })
    : undefined;

  return (
    <MenuItem
      size="400"
      radii="300"
      onClick={currentSelected ? undefined : () => setSessionUserId(userId)}
      variant={currentSelected ? 'Success' : 'Surface'}
      aria-pressed={currentSelected}
      before={
        <Avatar size="200" radii="Pill">
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            alt={userId}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      }
      after={
        <Text style={{ maxWidth: toRem(100) }} as="span" size="L400" truncate>
          {server}
        </Text>
      }
    >
      <Text style={{ flexGrow: 1 }} as="span" size="B400" truncate>
        {displayName}
      </Text>
    </MenuItem>
  );
}

type AccountSwitcherProps = {
  cords: RectCords;
  requestClose: () => void;
};
function AccountSwitcher({ cords, requestClose }: AccountSwitcherProps) {
  const navigate = useNavigate();

  const sessions = useSessions();

  const handleManageAccounts = () => {
    navigate(getRootPath());
  };

  return (
    <PopOut
      anchor={cords}
      position="Right"
      align="End"
      offset={6}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            returnFocusOnDeactivate: false,
            onDeactivate: () => requestClose(),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu style={{ maxWidth: toRem(250), width: '100vw' }}>
            {sessions.length > 0 && (
              <>
                <Scroll style={{ maxHeight: toRem(300) }} size="300" hideTrack>
                  <Box
                    direction="Column"
                    gap="0"
                    style={{
                      padding: `${config.space.S200} 0 ${config.space.S200} ${config.space.S200}`,
                    }}
                  >
                    {sessions.map((session) => (
                      <AccountTile key={session.userId} session={session} />
                    ))}
                  </Box>
                </Scroll>
                <Line size="300" />
              </>
            )}
            <Box direction="Column" gap="0" style={{ padding: config.space.S100 }}>
              <MenuItem
                size="300"
                radii="300"
                after={<Icon size="100" src={Icons.User} />}
                onClick={handleManageAccounts}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  Manage Accounts
                </Text>
              </MenuItem>
            </Box>
          </Menu>
        </FocusTrap>
      }
    />
  );
}

export function SettingsTab() {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const { userId, baseUrl } = ct.session;
  const profile = useUserProfile(userId);

  const [settings, setSettings] = useState(false);

  const displayName = profile?.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile?.avatarUrl
    ? mxcToHttp(baseUrl, profile.avatarUrl, useAuthentication).thumbnail({
        width: 96,
        height: 96,
        method: 'crop',
      })
    : undefined;

  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const openSettings = () => {
    setMenuAnchor(undefined);
    setSettings(true);
  };
  const closeSettings = () => setSettings(false);

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  const [switcherAnchor, setSwitcherAnchor] = useState<RectCords>();

  const handleOpenAccountSwitcher: MouseEventHandler<HTMLButtonElement> = (evt) => {
    evt.preventDefault();
    const cords = evt.currentTarget.getBoundingClientRect();
    setSwitcherAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  return (
    <SidebarItem active={settings}>
      <SidebarItemTooltip tooltip="User Menu">
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            ref={triggerRef}
            onClick={handleOpenMenu}
            onContextMenu={handleOpenAccountSwitcher}
          >
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              renderFallback={() => <Text size="H4">{nameInitials(displayName)}</Text>}
            />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      <PopOut
        anchor={menuAnchor}
        position="Right"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu style={{ maxWidth: toRem(200), width: '100vw' }}>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  size="300"
                  radii="300"
                  onClick={openSettings}
                  after={<Icon size="100" src={Icons.Setting} />}
                >
                  <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                    User Settings
                  </Text>
                </MenuItem>
                <MenuItem
                  size="300"
                  radii="300"
                  after={<Icon size="100" src={Icons.ArrowUpDown} />}
                  onClick={handleOpenAccountSwitcher}
                  aria-pressed={!!switcherAnchor}
                >
                  <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                    Switch Accounts
                  </Text>
                </MenuItem>
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
      {settings && (
        <Modal500 requestClose={closeSettings}>
          <Settings requestClose={closeSettings} />
        </Modal500>
      )}
      {switcherAnchor && (
        <AccountSwitcher
          cords={switcherAnchor}
          requestClose={() => {
            setMenuAnchor(undefined);
            setSwitcherAnchor(undefined);
          }}
        />
      )}
    </SidebarItem>
  );
}
