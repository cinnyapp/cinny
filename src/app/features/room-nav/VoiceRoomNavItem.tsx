import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import {
  Avatar,
  Box,
  Icon,
  IconButton,
  Icons,
  Text,
  Menu,
  MenuItem,
  config,
  PopOut,
  toRem,
  Line,
  RectCords,
  Spinner,
} from 'folds';
import { useFocusWithin, useHover } from 'react-aria';
import FocusTrap from 'focus-trap-react';
import { NavItem, NavItemContent, NavItemOptions, NavLink } from '../../components/nav';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVoiceParticipants } from '../../hooks/useVoiceParticipants';
import { useAtomValue } from 'jotai';
import { activeVoiceRoomAtom } from '../../state/voiceChannel';
import { copyToClipboard } from '../../utils/dom';
import { markAsRead } from '../../utils/notifications';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { stopPropagation } from '../../utils/keyboard';
import { getMatrixToRoom } from '../../plugins/matrix-to';
import { getCanonicalAliasOrRoomId, isRoomAlias } from '../../utils/matrix';
import { getViaServers } from '../../plugins/via-servers';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { nameInitials } from '../../utils/common';
import colorMXID from '../../../util/colorMXID';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { RoomAvatar } from '../../components/room-avatar';
import { getDirectRoomAvatarUrl } from '../../utils/room';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';

type VoiceRoomNavItemMenuProps = {
  room: Room;
  requestClose: () => void;
};
const VoiceRoomNavItemMenu = forwardRef<HTMLDivElement, VoiceRoomNavItemMenuProps>(
  ({ room, requestClose }, ref) => {
    const mx = useMatrixClient();
    const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
    const powerLevels = usePowerLevels(room);
    const creators = useRoomCreators(room);
    const permissions = useRoomPermissions(creators, powerLevels);
    const canInvite = permissions.action('invite', mx.getSafeUserId());
    const openRoomSettings = useOpenRoomSettings();
    const space = useSpaceOptionally();
    const [invitePrompt, setInvitePrompt] = useState(false);

    const handleMarkAsRead = () => {
      markAsRead(mx, room.roomId, hideActivity);
      requestClose();
    };

    const handleInvite = () => {
      setInvitePrompt(true);
    };

    const handleCopyLink = () => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, room.roomId);
      const viaServers = isRoomAlias(roomIdOrAlias) ? undefined : getViaServers(room);
      copyToClipboard(getMatrixToRoom(roomIdOrAlias, viaServers));
      requestClose();
    };

    const handleRoomSettings = () => {
      openRoomSettings(room.roomId, space?.roomId);
      requestClose();
    };

    return (
      <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
        {invitePrompt && room && (
          <InviteUserPrompt
            room={room}
            requestClose={() => {
              setInvitePrompt(false);
              requestClose();
            }}
          />
        )}
        <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
          <MenuItem
            onClick={handleMarkAsRead}
            size="300"
            after={<Icon size="100" src={Icons.CheckTwice} />}
            radii="300"
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Mark as Read
            </Text>
          </MenuItem>
        </Box>
        <Line variant="Surface" size="300" />
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
            onClick={handleCopyLink}
            size="300"
            after={<Icon size="100" src={Icons.Link} />}
            radii="300"
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Copy Link
            </Text>
          </MenuItem>
          <MenuItem
            onClick={handleRoomSettings}
            size="300"
            after={<Icon size="100" src={Icons.Setting} />}
            radii="300"
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Channel Settings
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
                    Leave Channel
                  </Text>
                </MenuItem>
                {promptLeave && (
                  <LeaveRoomPrompt
                    roomId={room.roomId}
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

type VoiceRoomNavItemProps = {
  room: Room;
  selected: boolean;
  linkPath: string;
};

export function VoiceRoomNavItem({ room, selected, linkPath }: VoiceRoomNavItemProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [hover, setHover] = useState(false);
  const { hoverProps } = useHover({ onHoverChange: setHover });
  const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const voiceParticipants = useVoiceParticipants(mx, room);
  const activeVoiceRoom = useAtomValue(activeVoiceRoomAtom);
  const isActiveVoiceRoom = activeVoiceRoom?.roomId === room.roomId;

  const handleContextMenu: MouseEventHandler<HTMLElement> = (evt) => {
    evt.preventDefault();
    setMenuAnchor({
      x: evt.clientX,
      y: evt.clientY,
      width: 0,
      height: 0,
    });
  };

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const optionsVisible = hover || !!menuAnchor;

  return (
    <Box direction="Column">
      <NavItem
        variant="Background"
        radii="400"
        aria-selected={selected}
        data-hover={!!menuAnchor}
        onContextMenu={handleContextMenu}
        {...hoverProps}
        {...focusWithinProps}
      >
        <NavLink to={linkPath}>
          <NavItemContent>
            <Box as="span" grow="Yes" alignItems="Center" gap="200">
              <Avatar
                size="200"
                radii="400"
                style={
                  isActiveVoiceRoom
                    ? { backgroundColor: 'var(--mx-success, #3fa55a)', color: '#fff' }
                    : undefined
                }
              >
                <Icon
                  src={Icons.VolumeHigh}
                  size="100"
                  filled={selected || isActiveVoiceRoom}
                />
              </Avatar>
              <Box as="span" grow="Yes">
                <Text as="span" size="Inherit" truncate>
                  {room.name}
                </Text>
              </Box>
              {!optionsVisible && isActiveVoiceRoom && (
                <Icon
                  size="100"
                  src={Icons.VolumeHigh}
                  style={{ color: 'var(--mx-success, #3fa55a)', opacity: 0.8 }}
                />
              )}
            </Box>
          </NavItemContent>
        </NavLink>
        {optionsVisible && (
          <NavItemOptions>
            <PopOut
              anchor={menuAnchor}
              offset={menuAnchor?.width === 0 ? 0 : undefined}
              alignOffset={menuAnchor?.width === 0 ? 0 : -5}
              position="Bottom"
              align={menuAnchor?.width === 0 ? 'Start' : 'End'}
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
                  <VoiceRoomNavItemMenu
                    room={room}
                    requestClose={() => setMenuAnchor(undefined)}
                  />
                </FocusTrap>
              }
            >
              <IconButton
                onClick={handleOpenMenu}
                aria-pressed={!!menuAnchor}
                variant="Background"
                fill="None"
                size="300"
                radii="300"
              >
                <Icon size="50" src={Icons.VerticalDots} />
              </IconButton>
            </PopOut>
          </NavItemOptions>
        )}
      </NavItem>

      {voiceParticipants.length > 0 && (
        <Box
          direction="Column"
          style={{
            paddingLeft: toRem(40),
            paddingBottom: config.space.S100,
          }}
        >
          {voiceParticipants.map((participant) => (
            <Box
              key={participant.userId}
              alignItems="Center"
              gap="200"
              style={{
                padding: `${config.space.S100} ${config.space.S200}`,
                borderRadius: config.radii.R300,
              }}
            >
              <div
                style={{
                  width: toRem(16),
                  height: toRem(16),
                  borderRadius: '50%',
                  backgroundColor: colorMXID(participant.userId),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: toRem(8),
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {nameInitials(participant.displayName ?? participant.userId).charAt(0)}
              </div>
              <Text size="T200" priority="300" truncate>
                {participant.displayName ?? participant.userId}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
