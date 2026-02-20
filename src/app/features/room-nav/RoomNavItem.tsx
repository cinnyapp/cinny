import React, { MouseEventHandler, forwardRef, useState, MouseEvent } from 'react';
import { EventType, Room } from 'matrix-js-sdk';
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
  Badge,
  Spinner,
  Tooltip,
  TooltipProvider,
} from 'folds';
import { useFocusWithin, useHover } from 'react-aria';
import FocusTrap from 'focus-trap-react';
import { useNavigate } from 'react-router-dom';
import { NavButton, NavItem, NavItemContent, NavItemOptions } from '../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../utils/room';
import { nameInitials } from '../../utils/common';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomUnread } from '../../state/hooks/unread';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { copyToClipboard } from '../../utils/dom';
import { markAsRead } from '../../utils/notifications';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { TypingIndicator } from '../../components/typing-indicator';
import { stopPropagation } from '../../utils/keyboard';
import { getMatrixToRoom } from '../../plugins/matrix-to';
import { getCanonicalAliasOrRoomId, isRoomAlias } from '../../utils/matrix';
import { getViaServers } from '../../plugins/via-servers';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import {
  getRoomNotificationModeIcon,
  RoomNotificationMode,
} from '../../hooks/useRoomsNotificationPreferences';
import { RoomNotificationModeSwitcher } from '../../components/RoomNotificationSwitcher';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { useCallState } from '../../pages/client/call/CallProvider';
import { useCallMembers } from '../../hooks/useCallMemberships';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { RoomNavUser } from './RoomNavUser';
import { useRoomName } from '../../hooks/useRoomMeta';

type RoomNavItemMenuProps = {
  room: Room;
  requestClose: () => void;
  notificationMode?: RoomNotificationMode;
};
const RoomNavItemMenu = forwardRef<HTMLDivElement, RoomNavItemMenuProps>(
  ({ room, requestClose, notificationMode }, ref) => {
    const mx = useMatrixClient();
    const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
    const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
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
            disabled={!unread}
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Mark as Read
            </Text>
          </MenuItem>
          <RoomNotificationModeSwitcher roomId={room.roomId} value={notificationMode}>
            {(handleOpen, opened, changing) => (
              <MenuItem
                size="300"
                after={
                  changing ? (
                    <Spinner size="100" variant="Secondary" />
                  ) : (
                    <Icon size="100" src={getRoomNotificationModeIcon(notificationMode)} />
                  )
                }
                radii="300"
                aria-pressed={opened}
                onClick={handleOpen}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  Notifications
                </Text>
              </MenuItem>
            )}
          </RoomNotificationModeSwitcher>
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
              Room Settings
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
                    Leave Room
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

type RoomNavItemProps = {
  room: Room;
  selected: boolean;
  linkPath: string;
  notificationMode?: RoomNotificationMode;
  showAvatar?: boolean;
  direct?: boolean;
};
export function RoomNavItem({
  room,
  selected,
  showAvatar,
  direct,
  notificationMode,
  linkPath,
}: RoomNavItemProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [hover, setHover] = useState(false);
  const { hoverProps } = useHover({ onHoverChange: setHover });
  const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
  const typingMember = useRoomTypingMember(room.roomId).filter(
    (receipt) => receipt.userId !== mx.getUserId()
  );

  const {
    isActiveCallReady,
    activeCallRoomId,
    setActiveCallRoomId,
    setViewedCallRoomId,
    isChatOpen,
    toggleChat,
    hangUp,
  } = useCallState();

  const isActiveCall = isActiveCallReady && activeCallRoomId === room.roomId;
  const callMemberships = useCallMembers(mx, room.roomId);

  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);
  const roomName = useRoomName(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canJoinCall = permissions.event(EventType.GroupCallMemberPrefix, mx.getSafeUserId());

  const { navigateRoom } = useRoomNavigate();
  const navigate = useNavigate();

  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

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

  const handleNavItemClick: MouseEventHandler<HTMLElement> = (evt) => {
    if (room.isCallRoom()) {
      if (!isMobile) {
        if (!isActiveCall && canJoinCall) {
          hangUp();
          setActiveCallRoomId(room.roomId);
        } else {
          navigateRoom(room.roomId);
        }
      } else {
        evt.stopPropagation();
        if (isChatOpen) toggleChat();
        setViewedCallRoomId(room.roomId);
        navigateRoom(room.roomId);
      }
    } else {
      navigate(linkPath);
    }
  };

  const handleChatButtonClick = (evt: MouseEvent<HTMLButtonElement>) => {
    evt.stopPropagation();
    if (!isChatOpen) toggleChat();
    setViewedCallRoomId(room.roomId);
    navigate(linkPath);
  };

  const optionsVisible = hover || !!menuAnchor;
  const ariaLabel = [
    roomName,
    room.isCallRoom()
      ? [
          'Call Room',
          isActiveCall && 'Currently in Call',
          callMemberships.length && `${callMemberships.length} in Call`,
        ]
      : 'Text Room',
    unread?.total && `${unread.total} Messages`,
  ]
    .flat()
    .filter(Boolean)
    .join(', ');

  return (
    <Box direction="Column" grow="Yes">
      <NavItem
        variant="Background"
        radii="400"
        highlight={unread !== undefined}
        aria-selected={selected}
        data-hover={!!menuAnchor}
        onContextMenu={handleContextMenu}
        {...hoverProps}
        {...focusWithinProps}
      >
        <NavButton onClick={handleNavItemClick} aria-label={ariaLabel}>
          <NavItemContent>
            <Box as="span" grow="Yes" alignItems="Center" gap="200">
              <Avatar size="200" radii="400">
                {showAvatar ? (
                  <RoomAvatar
                    roomId={room.roomId}
                    src={
                      direct
                        ? getDirectRoomAvatarUrl(mx, room, 96, useAuthentication)
                        : getRoomAvatarUrl(mx, room, 96, useAuthentication)
                    }
                    alt={roomName}
                    renderFallback={() => (
                      <Text as="span" size="H6">
                        {nameInitials(roomName)}
                      </Text>
                    )}
                  />
                ) : (
                  <RoomIcon
                    style={{
                      opacity: unread || isActiveCall ? config.opacity.P500 : config.opacity.P300,
                    }}
                    filled={selected || isActiveCall}
                    size="100"
                    joinRule={room.getJoinRule()}
                    roomType={room.getType()}
                  />
                )}
              </Avatar>
              <Box as="span" grow="Yes">
                <Text
                  priority={unread || isActiveCall ? '500' : '300'}
                  as="span"
                  size="Inherit"
                  truncate
                >
                  {roomName}
                </Text>
              </Box>
              {!optionsVisible && !unread && !selected && typingMember.length > 0 && (
                <Badge size="300" variant="Secondary" fill="Soft" radii="Pill" outlined>
                  <TypingIndicator size="300" disableAnimation />
                </Badge>
              )}
              {!optionsVisible && unread && (
                <UnreadBadgeCenter>
                  <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
                </UnreadBadgeCenter>
              )}
              {!optionsVisible && notificationMode !== RoomNotificationMode.Unset && (
                <Icon
                  size="50"
                  src={getRoomNotificationModeIcon(notificationMode)}
                  aria-label={notificationMode}
                />
              )}
            </Box>
          </NavItemContent>
        </NavButton>
        {optionsVisible && (
          <NavItemOptions>
            <PopOut
              id={`menu-${room.roomId}`}
              aria-expanded={!!menuAnchor}
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
                  <RoomNavItemMenu
                    room={room}
                    requestClose={() => setMenuAnchor(undefined)}
                    notificationMode={notificationMode}
                  />
                </FocusTrap>
              }
            >
              {room.isCallRoom() && (
                <TooltipProvider
                  position="Bottom"
                  offset={4}
                  tooltip={
                    <Tooltip>
                      <Text>Open Chat</Text>
                    </Tooltip>
                  }
                >
                  {(triggerRef) => (
                    <IconButton
                      ref={triggerRef}
                      data-testid="chat-button"
                      onClick={handleChatButtonClick}
                      aria-pressed={isChatOpen && selected}
                      aria-label="Open Chat"
                      variant="Background"
                      fill="None"
                      size="300"
                      radii="300"
                    >
                      <Icon size="50" src={Icons.Message} />
                    </IconButton>
                  )}
                </TooltipProvider>
              )}
              <IconButton
                onClick={handleOpenMenu}
                aria-pressed={!!menuAnchor}
                aria-controls={`menu-${room.roomId}`}
                aria-label="More Options"
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
      {room.isCallRoom() && (
        <Box direction="Column" style={{ paddingLeft: config.space.S200 }}>
          {callMemberships.map((callMembership) => (
            <RoomNavUser
              key={callMembership.membershipID}
              room={room}
              callMembership={callMembership}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
