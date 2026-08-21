import React, { MouseEventHandler, forwardRef, useState } from 'react';
import {
  Avatar,
  Box,
  Icon,
  IconButton,
  Icons,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  Tooltip,
  TooltipProvider,
  config,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { PageHeader } from '../../components/page';
import { useSetSetting } from '../../state/hooks/settings';
import { useSpace } from '../../hooks/useSpace';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import * as css from './LobbyHeader.css';
import { IPowerLevels } from '../../hooks/usePowerLevels';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveSpacePrompt } from '../../components/leave-space-prompt';
import { stopPropagation } from '../../utils/keyboard';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { BackRouteHandler } from '../../components/BackRouteHandler';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useOpenSpaceSettings } from '../../state/hooks/spaceSettings';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { useClient } from '../../hooks/useClient';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../hooks/storage/useGetRoomAvatar';
import { mxcToHttp } from '../../../client/mxcToHttp';

type LobbyMenuProps = {
  powerLevels: IPowerLevels;
  requestClose: () => void;
};
const LobbyMenu = forwardRef<HTMLDivElement, LobbyMenuProps>(
  ({ powerLevels, requestClose }, ref) => {
    const ct = useClient();
    const spaceId = useSpace();
    const creators = useRoomCreators(spaceId);

    const permissions = useRoomPermissions(creators, powerLevels);
    const canInvite = permissions.action('invite', ct.session.userId);
    const openSpaceSettings = useOpenSpaceSettings();

    const [invitePrompt, setInvitePrompt] = useState(false);

    const handleInvite = () => {
      setInvitePrompt(true);
    };

    const handleRoomSettings = () => {
      openSpaceSettings(spaceId);
      requestClose();
    };

    return (
      <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
        {invitePrompt && (
          <InviteUserPrompt
            roomId={spaceId}
            requestClose={() => {
              setInvitePrompt(false);
              requestClose();
            }}
          />
        )}
        <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
          <MenuItem
            onClick={handleInvite}
            variant="Primary"
            fill="None"
            size="300"
            after={<Icon size="100" src={Icons.UserPlus} />}
            radii="300"
            aria-pressed={invitePrompt}
            disabled={!canInvite}
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Invite
            </Text>
          </MenuItem>
          <MenuItem
            onClick={handleRoomSettings}
            size="300"
            after={<Icon size="100" src={Icons.Setting} />}
            radii="300"
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Space Settings
            </Text>
          </MenuItem>
        </Box>
        <Line variant="Surface" size="300" />
        <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
          <UseStateProvider initial={false}>
            {(promptLeave, setPromptLeave) => (
              <>
                <MenuItem
                  onClick={() => setPromptLeave(true)}
                  variant="Critical"
                  fill="None"
                  size="300"
                  after={<Icon size="100" src={Icons.ArrowGoLeft} />}
                  radii="300"
                  aria-pressed={promptLeave}
                >
                  <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                    Leave Space
                  </Text>
                </MenuItem>
                {promptLeave && (
                  <LeaveSpacePrompt
                    roomId={spaceId}
                    onDone={requestClose}
                    onCancel={() => setPromptLeave(false)}
                  />
                )}
              </>
            )}
          </UseStateProvider>
        </Box>
      </Menu>
    );
  }
);

type LobbyHeaderProps = {
  showProfile?: boolean;
  powerLevels: IPowerLevels;
};
export function LobbyHeader({ showProfile, powerLevels }: LobbyHeaderProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const spaceId = useSpace();
  const setPeopleDrawer = useSetSetting('isPeopleDrawer');
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const screenSize = useScreenSizeContext();

  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(spaceId);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes, roomToHeroMembersResult.value);

  const avatarMxc = getRoomAvatar(spaceId);
  const avatarUrl = avatarMxc
    ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
        width: 96,
        height: 96,
        method: 'crop',
      })
    : undefined;

  const name = getRoomName(spaceId) ?? 'Unknown';

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <PageHeader className={showProfile ? undefined : css.Header} balance>
      <Box grow="Yes" alignItems="Center" gap="200">
        {screenSize === ScreenSize.Mobile ? (
          <>
            <Box shrink="No">
              <BackRouteHandler>
                {(onBack) => (
                  <IconButton fill="None" onClick={onBack}>
                    <Icon src={Icons.ArrowLeft} />
                  </IconButton>
                )}
              </BackRouteHandler>
            </Box>
            <Box grow="Yes" justifyContent="Center">
              {showProfile && (
                <Text size="H3" truncate>
                  {name}
                </Text>
              )}
            </Box>
          </>
        ) : (
          <>
            <Box grow="Yes" basis="No" />
            <Box justifyContent="Center" alignItems="Center" gap="300">
              {showProfile && (
                <>
                  <Avatar size="300">
                    <RoomAvatar
                      roomId={spaceId}
                      src={avatarUrl}
                      alt={name}
                      renderFallback={() => <Text size="H4">{nameInitials(name)}</Text>}
                    />
                  </Avatar>
                  <Text size="H3" truncate>
                    {name}
                  </Text>
                </>
              )}
            </Box>
          </>
        )}
        <Box
          shrink="No"
          grow={screenSize === ScreenSize.Mobile ? 'No' : 'Yes'}
          basis={screenSize === ScreenSize.Mobile ? 'Yes' : 'No'}
          justifyContent="End"
        >
          {screenSize !== ScreenSize.Mobile && (
            <TooltipProvider
              position="Bottom"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>Members</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton
                  fill="None"
                  ref={triggerRef}
                  onClick={() => setPeopleDrawer((drawer) => !drawer)}
                >
                  <Icon size="400" src={Icons.User} />
                </IconButton>
              )}
            </TooltipProvider>
          )}
          <TooltipProvider
            position="Bottom"
            align="End"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>More Options</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton
                fill="None"
                onClick={handleOpenMenu}
                ref={triggerRef}
                aria-pressed={!!menuAnchor}
              >
                <Icon size="400" src={Icons.VerticalDots} filled={!!menuAnchor} />
              </IconButton>
            )}
          </TooltipProvider>
          <PopOut
            anchor={menuAnchor}
            position="Bottom"
            align="End"
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
                <LobbyMenu
                  powerLevels={powerLevels}
                  requestClose={() => setMenuAnchor(undefined)}
                />
              </FocusTrap>
            }
          />
        </Box>
      </Box>
    </PageHeader>
  );
}
